const amountInput = document.getElementById("amount");
const rateInput = document.getElementById("rate");
const yearsInput = document.getElementById("years");

const rateValue = document.getElementById("rate-value");
const yearsValue = document.getElementById("years-value");

const futureCost = document.getElementById("future-cost");
const futurePower = document.getElementById("future-power");
const powerLost = document.getElementById("power-lost");

const canvas = document.getElementById("inflation-chart");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("chart-tooltip");

const padding = { top: 20, right: 15, bottom: 35, left: 70 };
const nominalColor = "#496b52";
const powerColor = "#c18a45";

let chartData = null;
let hoverYear = null;

const euro = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
});

/** Purchasing power of `amount` after each year, in today's euros. */
function purchasingPowerByYear(amount, rate, years) {
    const values = [];
    for (let year = 0; year <= years; year++) {
        values.push(amount / Math.pow(1 + rate / 100, year));
    }
    return values;
}

function drawChart() {
    const { amount, powerValues } = chartData;
    const years = powerValues.length - 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = amount * 1.1;
    const xForYear = year => padding.left + (year / years) * chartWidth;
    const yForValue = value => padding.top + chartHeight - (value / maxValue) * chartHeight;

    // Grid and vertical axis labels
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#777d74";
    ctx.strokeStyle = "#e8e7df";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const value = (i / 4) * maxValue;
        const y = yForValue(value);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(euro.format(value), padding.left - 8, y);
    }

    // Shaded area: purchasing power lost
    ctx.beginPath();
    ctx.moveTo(xForYear(0), yForValue(amount));
    ctx.lineTo(xForYear(years), yForValue(amount));
    for (let year = years; year >= 0; year--) {
        ctx.lineTo(xForYear(year), yForValue(powerValues[year]));
    }
    ctx.closePath();
    ctx.fillStyle = "#c18a451f";
    ctx.fill();

    // Nominal value: flat dashed line
    ctx.beginPath();
    ctx.moveTo(xForYear(0), yForValue(amount));
    ctx.lineTo(xForYear(years), yForValue(amount));
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = nominalColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Purchasing power: declining line
    ctx.beginPath();
    powerValues.forEach((value, year) => {
        if (year === 0) {
            ctx.moveTo(xForYear(year), yForValue(value));
        } else {
            ctx.lineTo(xForYear(year), yForValue(value));
        }
    });
    ctx.strokeStyle = powerColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.fillStyle = powerColor;
    ctx.beginPath();
    ctx.arc(xForYear(years), yForValue(powerValues[years]), 4, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal axis labels: every 5 years (10 when crowded) plus the final year
    ctx.fillStyle = "#777d74";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const step = (chartWidth / years) * 5 < 30 ? 10 : 5;
    for (let year = 0; year < years; year += step) {
        if (year === 0 || years - year >= step / 2) {
            ctx.fillText(String(year), xForYear(year), height - 25);
        }
    }
    ctx.fillText(String(years), xForYear(years), height - 25);

    if (hoverYear === null) {
        tooltip.hidden = true;
        return;
    }

    // Hover marker: guide line, dots and tooltip
    const x = xForYear(hoverYear);
    ctx.strokeStyle = "#c9c8bf";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();

    [[amount, nominalColor], [powerValues[hoverYear], powerColor]].forEach(([value, color]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, yForValue(value), 5, 0, Math.PI * 2);
        ctx.fill();
    });

    tooltip.innerHTML = `
        <strong>Year ${hoverYear}</strong>
        <span class="tip-seven">Nominal: ${euro.format(amount)}</span>
        <span class="tip-four">Buys: ${euro.format(powerValues[hoverYear])}</span>`;
    tooltip.style.left = `${x}px`;
    tooltip.style.transform = x > width / 2
        ? "translateX(calc(-100% - 12px))"
        : "translateX(12px)";
    tooltip.hidden = false;
}

function updateHover(event) {
    const years = chartData.powerValues.length - 1;
    const chartWidth = canvas.clientWidth - padding.left - padding.right;
    const position = (event.offsetX - padding.left) / chartWidth;

    hoverYear = Math.min(years, Math.max(0, Math.round(position * years)));
    drawChart();
}

function updateCalculator() {
    const amount = Math.min(1000000, Math.max(100, Number(amountInput.value) || 100));
    const rate = Number(rateInput.value);
    const years = Number(yearsInput.value);
    const factor = Math.pow(1 + rate / 100, years);

    rateValue.textContent = `${rate.toFixed(1)}%`;
    yearsValue.textContent = years === 1 ? "1 year" : `${years} years`;

    futureCost.textContent = euro.format(amount * factor);
    futurePower.textContent = euro.format(amount / factor);
    powerLost.textContent = `${((1 - 1 / factor) * 100).toFixed(1)}%`;

    chartData = { amount, powerValues: purchasingPowerByYear(amount, rate, years) };
    hoverYear = null;
    drawChart();
}

amountInput.addEventListener("input", updateCalculator);
rateInput.addEventListener("input", updateCalculator);
yearsInput.addEventListener("input", updateCalculator);

canvas.addEventListener("pointermove", updateHover);
canvas.addEventListener("pointerdown", updateHover);
canvas.addEventListener("pointerleave", () => {
    hoverYear = null;
    drawChart();
});

window.addEventListener("resize", updateCalculator);

updateCalculator();
