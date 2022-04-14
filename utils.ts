import {format, add} from 'date-fns';

export function n_months_timedelta(from: Date, to: Date): number {
    var years = to.getFullYear() - from.getFullYear();
    var months = to.getMonth() < from.getMonth() ? from.getMonth()-to.getMonth()-12 : to.getMonth()-from.getMonth();
    var total = years*12 + months 
    return total
}

export function get_dates_array(start_date: Date, months_array: Array<number>) {
    return months_array.map(n => add(start_date, {months: n}))
}
export function format_date_array(date_array: Array<Date>, str_format: string) {
    return date_array.map(_date => format(_date, str_format))
}
export function reset_array(array: Array<number>, value: number) {
    array.length = 0
    array[0] = value
}
