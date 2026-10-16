(() => {
    const dataElement = document.getElementById('dashboard-data');
    if (!dataElement || typeof Chart === 'undefined') return;

    const data = JSON.parse(dataElement.textContent);
    const colors = { Hadir: '#1f9d72', Izin: '#e6a23c', Alpa: '#e16a63' };
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 18 } },
            tooltip: { backgroundColor: '#172b25', padding: 12, cornerRadius: 9 },
        },
        scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: '#84938d' } },
            y: { beginAtZero: true, ticks: { precision: 0, color: '#84938d' }, grid: { color: '#edf1ef' }, border: { display: false } },
        },
    };

    new Chart(document.getElementById('monthlyChart'), {
        type: 'line',
        data: {
            labels: data.monthLabels,
            datasets: Object.entries(data.monthly).map(([label, values]) => ({
                label,
                data: values,
                borderColor: colors[label],
                backgroundColor: colors[label],
                tension: 0.35,
                borderWidth: 3,
                pointRadius: 3,
                fill: false,
            })),
        },
        options: commonOptions,
    });

    new Chart(document.getElementById('categoryChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.categories),
            datasets: Object.entries(colors).map(([label, color]) => ({
                label,
                data: Object.values(data.categories).map((counts) => counts[label]),
                backgroundColor: color,
                borderRadius: 6,
                maxBarThickness: 32,
            })),
        },
        options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, stacked: false } } },
    });
})();
