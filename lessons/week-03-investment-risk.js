const ANNUAL_RETURN = 0.05;

const amountInput = document.getElementById("amount");
const yearsInput = document.getElementById("years");
const volatilityAInput = document.getElementById("volatility-a");
const volatilityBInput = document.getElementById("volatility-b");
const seedInput = document.getElementById("seed");
const newSimulationButton = document.getElementById("new-simulation");

const yearsValue = document.getElementById("years-value");
const volatilityAValue = document.getElementById("volatility-a-value");
const volatilityBValue = document.getElementById("volatility-b-value");

const finalA = document.getElementById("final-a");
const finalB = document.getElementById("final-b");
const drawdownA = document.getElementById("drawdown-a");
const drawdownB = document.getElementById("drawdown-b");
const journeySummary = document.getElementById("journey-summary");

const canvas = document.getElementById("risk-chart");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("chart-tooltip");

const padding = { top: 20, right: 15, bottom: 35, left: 80 };
const colorA = "#496b52";
const colorB = "#c18a45";
const startColor = "#b5bdb3";

let chartData = null;
let hoverMonth = null;

const euro = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
});

const percent = fraction => `${(fraction * 100).toFixed(1)}%`;

/** Text for a point in time given as a number of months. */
function formatTime(month) {
    const years = Math.floor(month / 12);
    const months = month % 12;
    const yearText = years === 1 ? "1 year" : `${years} years`;
    return months === 0 ? yearText : `${yearText}, ${months} mo`;
}

/** Round a grid step up to 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(rawStep) {
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const multiple = [1, 2, 2.5, 5, 10].find(m => m * power >= rawStep);
    return multiple * power;
}

function drawLine(values, xForMonth, yForValue, color) {
    ctx.beginPath();
    values.forEach((value, month) => {
        if (month === 0) {
            ctx.moveTo(xForMonth(month), yForValue(value));
        } else {
            ctx.lineTo(xForMonth(month), yForValue(value));
        }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
}

function drawChart() {
    const { amount, valuesA, valuesB } = chartData;
    const months = valuesA.length - 1;
    const years = months / 12;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const gridStep = niceStep(Math.max(...valuesA, ...valuesB) / 4);
    const gridLines = Math.ceil(Math.max(...valuesA, ...valuesB) / gridStep);
    const maxValue = gridStep * gridLines;
    const xForMonth = month => padding.left + (month / months) * chartWidth;
    const yForValue = value => padding.top + chartHeight - (value / maxValue) * chartHeight;

    // Grid and vertical axis labels
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#777d74";
    ctx.strokeStyle = "#e8e7df";
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridLines; i++) {
        const value = i * gridStep;
        const y = yForValue(value);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(euro.format(value), padding.left - 8, y);
    }

    // Initial investment: flat dashed line
    ctx.beginPath();
    ctx.moveTo(xForMonth(0), yForValue(amount));
    ctx.lineTo(xForMonth(months), yForValue(amount));
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = startColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    drawLine(valuesB, xForMonth, yForValue, colorB);
    drawLine(valuesA, xForMonth, yForValue, colorA);

    // Horizontal axis labels: every 5 years (10 when crowded) plus the final year
    ctx.fillStyle = "#777d74";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const step = (chartWidth / years) * 5 < 30 ? 10 : 5;
    for (let year = 0; year < years; year += step) {
        if (year === 0 || years - year >= step / 2) {
            ctx.fillText(String(year), xForMonth(year * 12), height - 25);
        }
    }
    ctx.fillText(String(years), xForMonth(months), height - 25);

    if (hoverMonth === null) {
        tooltip.hidden = true;
        return;
    }

    // Hover marker: guide line, dots and tooltip
    const x = xForMonth(hoverMonth);
    ctx.strokeStyle = "#c9c8bf";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();

    [[valuesA[hoverMonth], colorA], [valuesB[hoverMonth], colorB]].forEach(([value, color]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, yForValue(value), 5, 0, Math.PI * 2);
        ctx.fill();
    });

    tooltip.innerHTML = `
        <strong>${formatTime(hoverMonth)}</strong>
        <span class="tip-seven">A: ${euro.format(valuesA[hoverMonth])}</span>
        <span class="tip-four">B: ${euro.format(valuesB[hoverMonth])}</span>`;
    tooltip.style.left = `${x}px`;
    tooltip.style.transform = x > width / 2
        ? "translateX(calc(-100% - 12px))"
        : "translateX(12px)";
    tooltip.hidden = false;
}

function updateHover(event) {
    const months = chartData.valuesA.length - 1;
    const chartWidth = canvas.clientWidth - padding.left - padding.right;
    const position = (event.offsetX - padding.left) / chartWidth;

    hoverMonth = Math.min(months, Math.max(0, Math.round(position * months)));
    drawChart();
}

/** One-sentence comparison of the two journeys. */
function describeJourneys(endA, endB, fallA, fallB) {
    const gap = endB - endA;
    const ending = gap >= 0
        ? `In this simulation, B ended ${euro.format(gap)} ahead of A.`
        : `In this simulation, B ended ${euro.format(-gap)} behind A.`;
    return `${ending} Along the way, B's biggest fall from a peak was ${percent(fallB)}, compared with ${percent(fallA)} for A.`;
}

function updateSimulation() {
    const amount = Math.min(1000000, Math.max(100, Number(amountInput.value) || 100));
    const years = Number(yearsInput.value);
    const volatilityA = Number(volatilityAInput.value) / 100;
    const volatilityB = Number(volatilityBInput.value) / 100;
    const seed = Math.max(1, Math.round(Number(seedInput.value)) || 1);

    yearsValue.textContent = years === 1 ? "1 year" : `${years} years`;
    volatilityAValue.textContent = `${volatilityAInput.value}%`;
    volatilityBValue.textContent = `${volatilityBInput.value}%`;

    const shocks = monthlyShocks(seed, years * 12);
    const valuesA = simulatePath(amount, ANNUAL_RETURN, volatilityA, shocks.a);
    const valuesB = simulatePath(amount, ANNUAL_RETURN, volatilityB, shocks.b);
    const fallA = maxDrawdown(valuesA);
    const fallB = maxDrawdown(valuesB);
    const endA = valuesA[valuesA.length - 1];
    const endB = valuesB[valuesB.length - 1];

    finalA.textContent = euro.format(endA);
    finalB.textContent = euro.format(endB);
    drawdownA.textContent = `Biggest fall from a peak: ${percent(fallA)}`;
    drawdownB.textContent = `Biggest fall from a peak: ${percent(fallB)}`;
    journeySummary.textContent = describeJourneys(endA, endB, fallA, fallB);

    chartData = { amount, valuesA, valuesB };
    hoverMonth = null;
    drawChart();
}

[amountInput, yearsInput, volatilityAInput, volatilityBInput, seedInput].forEach(input => {
    input.addEventListener("input", updateSimulation);
});

newSimulationButton.addEventListener("click", () => {
    seedInput.value = Math.max(1, Math.round(Number(seedInput.value)) || 1) + 1;
    updateSimulation();
});

canvas.addEventListener("pointermove", updateHover);
canvas.addEventListener("pointerdown", updateHover);
canvas.addEventListener("pointerleave", () => {
    hoverMonth = null;
    drawChart();
});

window.addEventListener("resize", updateSimulation);

updateSimulation();
