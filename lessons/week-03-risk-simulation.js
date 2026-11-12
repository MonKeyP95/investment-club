/** Seeded pseudo-random generator (mulberry32): the same seed always gives the same sequence. */
function createRandom(seed) {
    let state = seed >>> 0;
    return function () {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standard normal random number (Box-Muller). */
function normalDraw(random) {
    const u = 1 - random();
    const v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Independent monthly shocks for investments A and B, drawn month by month from one seed. */
function monthlyShocks(seed, months) {
    const random = createRandom(seed);
    const a = [];
    const b = [];
    for (let month = 0; month < months; month++) {
        a.push(normalDraw(random));
        b.push(normalDraw(random));
    }
    return { a, b };
}

/**
 * Monthly values of one investment.
 * The drift makes typical (median) growth equal `annualReturn` per year;
 * `volatility` (annual, e.g. 0.2) only scales the size of the random shocks.
 */
function simulatePath(amount, annualReturn, volatility, shocks) {
    const drift = Math.log(1 + annualReturn) / 12;
    const monthlyVolatility = volatility / Math.sqrt(12);
    const values = [amount];
    shocks.forEach(shock => {
        values.push(values[values.length - 1] * Math.exp(drift + monthlyVolatility * shock));
    });
    return values;
}

/** Largest fall from a previous peak, as a fraction (0.25 means a 25% decline). */
function maxDrawdown(values) {
    let peak = values[0];
    let worst = 0;
    values.forEach(value => {
        peak = Math.max(peak, value);
        worst = Math.max(worst, 1 - value / peak);
    });
    return worst;
}
