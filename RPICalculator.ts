import { reset_array } from './utils';
import {rpi_average, rpi_std, rpi_min, rpi_max} from './DefaultValues';

function normalRandom() {
	var spareRandom = null;
	var val, u, v, s, mul;

	if (spareRandom !== null) {
		val = spareRandom;
		spareRandom = null;
	} else {
		do {
			u = Math.random() * 2 - 1;
			v = Math.random() * 2 - 1;

			s = u * u + v * v;
		} while (s === 0 || s >= 1);

		mul = Math.sqrt((-2 * Math.log(s)) / s);

		val = u * mul;
		spareRandom = v * mul;
	}

	return val;
}

function normalRandomScaled(mean, stddev, min, max, iteration) {
	var r = normalRandom();
	const max_iteration = 20;

	r = r * stddev + mean;

	if (min < r && r < max) {
		return r;
	} else if (iteration < max_iteration) {
		return normalRandomScaled(mean, stddev, min, max, iteration+1);
	} else {
		if (min>r) {
			return min
		} else {
			return max
		}
	}
}

export class RPICalculator {
	fixed: boolean = true;
	randomized_arr: Array<number> = [];
	
	// values calculated from the last 40-ish years of RPI 
	fixed_value: number = rpi_average;
	mean: number = rpi_average;
	std: number = rpi_std;
	min: number = rpi_min;
	max: number = rpi_max;

	
	recalculate() {
		reset_array(this.randomized_arr, this.get_rand_val());
		for (var i = 0; i < 50; i++) {
			this.randomized_arr.push(this.get_rand_val());
		}
	}

	get_rand_val(): number {
		return normalRandomScaled(this.mean, this.std, this.min, this.max, 0);
	}

	get_value(year): number {
		var value
		if (this.fixed) {
			value = this.fixed_value;
		} else {
			value = this.randomized_arr[year]
		}
		return value/100.0
	}
}
