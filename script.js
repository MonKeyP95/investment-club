
const initialInput = document.getElementById("initial");
const yearsInput = document.getElementById("years");

const yearsValue = document.getElementById("years-value");

const finalFour = document.getElementById("final-four");
const finalSeven = document.getElementById("final-seven");
const gainFour = document.getElementById("gain-four");
const gainSeven = document.getElementById("gain-seven");
const growthFour = document.getElementById("growth-four");
const growthSeven = document.getElementById("growth-seven");

const canvas = document.getElementById("growth-chart");
const ctx = canvas.getContext("2d");

const chartButtons = document.querySelectorAll(".chart-mode");

let chartMode = "value";

const euro = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
});

function calculateGrowth(initial, rate, years) {
    const values = [];

    for (let year = 0; year <= years; year++) {
        values.push(initial * Math.pow(1 + rate / 100, year));
    }

    return values;
}

function drawChart(valuesFour, valuesSeven, initial) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Convert investment values into cumulative growth percentages
    if (chartMode === "growth") {
        valuesFour = valuesFour.map(value =>
            ((value / initial) - 1) * 100
        );

        valuesSeven = valuesSeven.map(value =>
            ((value / initial) - 1) * 100
        );
    }

    const padding = { top: 20, right: 15, bottom: 35, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...valuesFour, ...valuesSeven) * 1.1;

    // Grid and vertical axis labels
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#777d74";
    ctx.strokeStyle = "#e8e7df";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y = padding.top + chartHeight - (i / 4) * chartHeight;
        const value = (i / 4) * maxValue;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const label = chartMode === "value"
            ? euro.format(value)
            : `${value.toFixed(0)}%`;

        ctx.fillText(label, padding.left - 8, y);
    }

    // Draw an investment line
    function drawLine(values, color) {
        ctx.beginPath();

        values.forEach((value, index) => {
            const x = padding.left +
                (index / (values.length - 1)) * chartWidth;

            const y = padding.top + chartHeight -
                (value / maxValue) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.stroke();

        const lastValue = values[values.length - 1];
        const lastY = padding.top + chartHeight -
            (lastValue / maxValue) * chartHeight;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(width - padding.right, lastY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawLine(valuesFour, "#c18a45");
    drawLine(valuesSeven, "#496b52");

    // Horizontal axis labels
    ctx.fillStyle = "#777d74";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.fillText("Year 0", padding.left, height - 25);
    ctx.fillText(
        `Year ${valuesFour.length - 1}`,
        width - padding.right,
        height - 25
    );
}

function updateCalculator() {
    const initial = Math.min(
        1000000,
        Math.max(100, Number(initialInput.value) || 100)
    );

    const years = Number(yearsInput.value);

    yearsValue.textContent = `${years} years`;

    const valuesFour = calculateGrowth(initial, 4, years);
    const valuesSeven = calculateGrowth(initial, 7, years);

    const totalFour = valuesFour[years];
    const totalSeven = valuesSeven[years];

    finalFour.textContent = euro.format(totalFour);
    finalSeven.textContent = euro.format(totalSeven);

    gainFour.textContent = `${euro.format(totalFour - initial)} growth`;
    gainSeven.textContent = `${euro.format(totalSeven - initial)} growth`;

    growthFour.textContent = `+${((totalFour / initial - 1) * 100).toFixed(1)}% growth`;
    growthSeven.textContent = `+${((totalSeven / initial - 1) * 100).toFixed(1)}% growth`;

    drawChart(valuesFour, valuesSeven, initial);
}

// Update when inputs change
initialInput.addEventListener("input", updateCalculator);
yearsInput.addEventListener("input", updateCalculator);

// Switch between value and percentage
chartButtons.forEach(button => {
    button.addEventListener("click", () => {
        chartMode = button.dataset.mode;

        chartButtons.forEach(item => {
            const isActive = item === button;
            item.classList.toggle("active", isActive);
            item.setAttribute("aria-pressed", String(isActive));
        });

        updateCalculator();
    });
});

window.addEventListener("resize", updateCalculator);

updateCalculator();
