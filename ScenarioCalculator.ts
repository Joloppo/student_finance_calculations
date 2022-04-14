import { n_months_timedelta, get_dates_array, format_date_array, reset_array } from './utils';
import type { RPICalculator } from './RPICalculator';
import { inflation_average } from './DefaultValues';

export default class ScenarioCalculator {
    name: string = "default"
    active: boolean = false

    today = new Date();
    current_loan_arr: Array<number> = [0];
    current_labels_arr: Array<any> = [];
    monthly_payment_arr: Array<number> = [];
    interest_arr: Array<number> = [];
    total_payment_arr: Array<number> = [];
    total_interest_arr: Array<number> = [];
    total_amount_saved_arr: Array<number> = [];
    salary_arr: Array<number> = [];
    current_investment_arr: Array<number> = [];

    rpi_calculator: RPICalculator

    constructor(rpi_calculator) {
        this.rpi_calculator = rpi_calculator
    }

    // plan options
    plan_1_selected: boolean = false
    get_yearly_threshold(year: number): number {
        let value = this.plan_1_selected ? 1_657*12 : 2_274*12
        if (this.threshold_adjust) {
            value = value * Math.pow((1 + this.threshold_inflation_percent/100), year)
        }
        return value
    }
    threshold_adjust: boolean = true
    threshold_inflation_percent: number = inflation_average

    m_debt_writeoff: number;
    y_debt_writeoff: number;
    get_y_until_debt_writeoff(): number {
        return this.plan_1_selected ? 25 : 30
    }
    
    date_debt_writeoff: Date = new Date(this.today.getFullYear()+this.get_y_until_debt_writeoff(), 7); // this is just the default
    written_off: boolean;

    

    // extra repayments
    extra_repayments_active: boolean = false
    extra_repayments_percent: number = 0.0
    extra_repayments_amount: number = 0
    extra_repayments_use_percent: boolean = true

    // salary increase
    salary_increase_active: boolean = false
    salary_increase_use_percent: boolean | any = true
    salary_percent_increase: number = 0
    salary_amount_increase: number = 0

    salary_limit_active: boolean = false
    salary_limit: number = 0

    // investment
    investment_active: boolean = false;
    investment_use_capital_to_payoff_loan: boolean = false;
    investment_capital: number = 0;
    investment_percentage_roi: number = 7;
    investment_subtract_from_payments_made: boolean = true;

    get_monthly_investment_multiplier(): number { // these equates to investment_percentage_roi per year
        return Math.pow(1+this.investment_percentage_roi/100, 1/12)
    }

    // dates
    m_graduated: number = this.today.getMonth();
    y_graduated: number = this.today.getFullYear()-1;
    readonly graduation_y_minimum: number = this.today.getFullYear()-30

    graduation_year_options: Array<number> = [...Array(new Date().getFullYear()+1 - this.graduation_y_minimum).keys()].map(i => i + this.graduation_y_minimum)
    graduation_months_options: Array<number> = [...Array(12).keys()].map(i => i )
    readonly tax_percent: number = 0.09

    starting_loans: number = 45_678
    annual_income: number | any = 76_543
    show_amount_saved: boolean = false

    n_months: number = n_months_timedelta(this.today, this.date_debt_writeoff)
    months_passed: Array<number> = [...Array(this.n_months).keys()]
    dates_array: Array<Date> = get_dates_array(new Date(), this.months_passed) // Todo: Set this properly. ... ? if in future?
    date_labels: Array<string> = format_date_array(this.dates_array, 'yyyy-MM-dd')

    readonly months_dict = {
        0: "January", 
        1: "February", 
        2: "March", 
        3: "April", 
        4: "May",
        5: "June", 
        6: "July", 
        7: "August", 
        8: "September", 
        9: "October", 
        10: "November", 
        11: "December"
    }

    get_total_paid(): number {
        return this.total_payment_arr[this.total_payment_arr.length-1]
    }

    get_monthly_repayment(salary: number, year: number) {
        if (salary < this.get_yearly_threshold(year)) {return 0}
        else {
            return ((salary-this.get_yearly_threshold(year))/12) * this.tax_percent
        }
    }

    get_rpi(year: number): number {
        return this.rpi_calculator.get_value(year)
    }

    get_interest_multiplier(yearly_salary: number, year: number): number { // rpi
        let rpi = this.get_rpi(year)
        if (this.plan_1_selected) {
            return rpi
        }
        else {
            if (yearly_salary < 27_295) {
                return rpi
            } else if (yearly_salary > 49_130) {
                return rpi + 0.03
            } else {
                // NO IDEA WHETHER the 3% scale linearly
                let min_ = 27_295
                let max_ = 49_130
                let scaling_span = max_ - min_
                let over_min = yearly_salary - min_
                return rpi + 0.03 * (over_min / scaling_span)
            }
        }
    }

    calculate_data(): void {
        this.m_debt_writeoff = this.m_graduated
        this.y_debt_writeoff = this.y_graduated + this.get_y_until_debt_writeoff()
        this.date_debt_writeoff = new Date(this.y_debt_writeoff, this.m_debt_writeoff)
        this.n_months = n_months_timedelta(this.today, this.date_debt_writeoff)

        let starting_loan = this.investment_active && this.investment_use_capital_to_payoff_loan ? this.starting_loans-this.investment_capital : this.starting_loans
        reset_array(this.current_loan_arr, starting_loan)
        let starting_total_payment = this.investment_active && this.investment_use_capital_to_payoff_loan ? this.investment_capital : 0
        reset_array(this.total_payment_arr, starting_total_payment)
        reset_array(this.total_interest_arr, 0)
        reset_array(this.total_amount_saved_arr, 0)
        reset_array(this.salary_arr, this.annual_income)
        reset_array(this.current_investment_arr, this.investment_capital)

        // run through each month and apply calculations
        until_zero:
            for(let month=1; month < this.n_months; month++) {
                let last_year = Math.floor((month-1)/12)
                let current_year = Math.floor(month/12)
                let is_new_year = current_year > last_year
                
                // salary increase
                if (this.salary_increase_active && is_new_year) {
                    this.salary_arr[month] = this.annual_income
                    if (this.salary_increase_use_percent) {
                        this.salary_arr[month] = this.salary_arr[month-1] * (100+this.salary_percent_increase)/100
                    } else {
                        this.salary_arr[month] = this.salary_arr[month-1] + this.salary_amount_increase
                    }
                    if (this.salary_increase_active && this.salary_limit_active && this.salary_arr[month] > this.salary_limit) {
                        this.salary_arr[month] =  this.salary_limit
                    }
                } else {
                    this.salary_arr[month] = this.salary_arr[month-1]
                }
                
                let this_y_salary = this.salary_arr[month]
                let this_m_repayment = this.get_monthly_repayment(this_y_salary, current_year)
                let last_m_loan = this.current_loan_arr[month-1]

                // extra repayments
                if (this.extra_repayments_active) {
                    if (this.extra_repayments_use_percent) {
                        this_m_repayment += (this_y_salary/12)*(this.extra_repayments_percent/100)
                    } else {
                        this_m_repayment += this.extra_repayments_amount
                    }
                }

                // investment
                if (this.investment_active) {
                    if (this.investment_use_capital_to_payoff_loan) {
                        this.current_investment_arr[month] = 0
                    } else {
                        this.current_investment_arr[month] = this.current_investment_arr[month-1] * this.get_monthly_investment_multiplier()
                    }
                }

                this.interest_arr[month] = last_m_loan * this.get_interest_multiplier(this_y_salary, current_year)/12
                
                this.monthly_payment_arr[month] = (last_m_loan+this.interest_arr[month] < this_m_repayment) ? last_m_loan+this.interest_arr[month] : this_m_repayment

                this.total_interest_arr[month] = this.total_interest_arr[month-1] + this.interest_arr[month]
                this.total_payment_arr[month] = this.total_payment_arr[month-1] + this.monthly_payment_arr[month]
                this.current_loan_arr[month] = last_m_loan + this.interest_arr[month] - this.monthly_payment_arr[month]
                this.total_amount_saved_arr[month] = this.total_amount_saved_arr[month-1]+ ((last_m_loan < this_m_repayment) ? this_m_repayment-last_m_loan : 0)

                if (this.investment_active && !this.investment_use_capital_to_payoff_loan && this.investment_subtract_from_payments_made) {
                    let profit = this.current_investment_arr[month] - this.current_investment_arr[month-1]
                    this.total_payment_arr[month] = this.total_payment_arr[month]-profit

                }
                
                if (Math.round(this.current_loan_arr[month]) <= 0 && !this.show_amount_saved) {
                    this.current_loan_arr[month] = 0
                    this.current_loan_arr.length = this.monthly_payment_arr.length = this.interest_arr.length = this.total_interest_arr.length = this.total_payment_arr.length = this.total_amount_saved_arr.length = month+1
                    this.written_off = false
                    break until_zero;
                } else {
                    this.written_off = true
                }
            };
        // end until_zero
        this.current_labels_arr = this.date_labels.slice(0, this.current_loan_arr.length);
    }
}
