// グローバル変数
let isLoanPurchase = false;
let calculationData = {};

// DOM要素の取得
const cashBtn = document.getElementById('cashBtn');
const loanBtn = document.getElementById('loanBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// イベントリスナーの設定
cashBtn.addEventListener('click', () => {
    isLoanPurchase = false;
    cashBtn.classList.add('active');
    loanBtn.classList.remove('active');
    document.getElementById('loanSection').style.display = 'none';
    calculateAll();
});

loanBtn.addEventListener('click', () => {
    isLoanPurchase = true;
    loanBtn.classList.add('active');
    cashBtn.classList.remove('active');
    document.getElementById('loanSection').style.display = 'block';
    calculateAll();
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
});

// 家賃節約オプションの有効/無効
document.getElementById('enableRentSaving').addEventListener('change', (e) => {
    document.getElementById('monthlyRentSaving').disabled = !e.target.checked;
    calculateAll();
});

// 売却価格算出方法の切替
document.getElementById('salePriceMethod').addEventListener('change', (e) => {
    if (e.target.value === 'direct') {
        document.getElementById('salePriceDirect').style.display = 'block';
        document.getElementById('salePriceRate').style.display = 'none';
    } else {
        document.getElementById('salePriceDirect').style.display = 'none';
        document.getElementById('salePriceRate').style.display = 'block';
    }
    calculateAll();
});

// すべての入力フィールドにイベントリスナーを追加
const inputs = document.querySelectorAll('input, select');
inputs.forEach(input => {
    input.addEventListener('input', calculateAll);
    input.addEventListener('change', calculateAll);
});

// 初期計算実行
calculateAll();

// メイン計算関数
function calculateAll() {
    calculationData = {
        purchaseMethod: isLoanPurchase ? 'loan' : 'cash',
        initialCosts: calculateInitialCosts(),
        loanInfo: calculateLoanInfo(),
        cashflow: calculateCashflow(),
        sale: calculateSale(),
        total: calculateTotal()
    };

    updateInitialCostsDisplay();
    updateCashflowDisplay();
    updateSaleDisplay();
}

// 初期費用計算
function calculateInitialCosts() {
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value) || 0;
    const earnestMoney = parseFloat(document.getElementById('earnestMoney').value) || 0;
    const brokerageFee = parseFloat(document.getElementById('brokerageFee').value) || 0;
    const otherContractFee = parseFloat(document.getElementById('otherContractFee').value) || 0;
    const downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
    const registrationFee = parseFloat(document.getElementById('registrationFee').value) || 0;
    const stampDuty = parseFloat(document.getElementById('stampDuty').value) || 0;
    const otherSettlementFee = parseFloat(document.getElementById('otherSettlementFee').value) || 0;
    const otherLaterFee = parseFloat(document.getElementById('otherLaterFee').value) || 0;

    const totalContractFee = earnestMoney + brokerageFee + otherContractFee;
    const totalSettlementFee = downPayment + registrationFee + stampDuty + otherSettlementFee;
    const totalLaterFee = otherLaterFee;

    let totalInitialCost = totalContractFee + totalSettlementFee + totalLaterFee;

    // ローン購入の場合、頭金は自己資金として計上
    if (isLoanPurchase) {
        const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
        // 購入価格 - 借入金額 = 自己資金（頭金含む）
        const selfFund = purchasePrice - loanAmount;
        totalInitialCost = totalContractFee + selfFund + registrationFee + stampDuty + otherSettlementFee + totalLaterFee;
    }

    return {
        purchasePrice,
        totalContractFee,
        totalSettlementFee,
        totalLaterFee,
        totalInitialCost
    };
}

// ローン情報計算
function calculateLoanInfo() {
    if (!isLoanPurchase) {
        return null;
    }

    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const loanYears = parseInt(document.getElementById('loanYears').value) || 35;
    const repaymentMethod = document.getElementById('repaymentMethod').value;

    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = loanYears * 12;

    let monthlyPayment = 0;
    let annualPayments = [];

    if (repaymentMethod === 'equal') {
        // 元利均等返済
        if (monthlyRate === 0) {
            monthlyPayment = loanAmount / totalMonths;
        } else {
            monthlyPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / 
                           (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }
        // 年間返済額の計算
        const annualPayment = monthlyPayment * 12;
        for (let i = 0; i < loanYears; i++) {
            annualPayments.push(annualPayment);
        }
    } else {
        // 元金均等返済
        const principalPayment = loanAmount / totalMonths;
        for (let year = 1; year <= loanYears; year++) {
            let yearTotal = 0;
            for (let month = 1; month <= 12; month++) {
                const monthNum = (year - 1) * 12 + month;
                if (monthNum > totalMonths) break;
                const remainingPrincipal = loanAmount - principalPayment * (monthNum - 1);
                const interestPayment = remainingPrincipal * monthlyRate;
                yearTotal += principalPayment + interestPayment;
            }
            annualPayments.push(yearTotal);
        }
    }

    // ローン残高の計算
    const loanBalances = [];
    let remainingBalance = loanAmount;
    
    for (let year = 1; year <= loanYears; year++) {
        if (repaymentMethod === 'equal') {
            for (let month = 1; month <= 12; month++) {
                if (remainingBalance <= 0) break;
                const interest = remainingBalance * monthlyRate;
                const principal = monthlyPayment - interest;
                remainingBalance = Math.max(0, remainingBalance - principal);
            }
        } else {
            const principalPayment = loanAmount / totalMonths;
            for (let month = 1; month <= 12; month++) {
                const monthNum = (year - 1) * 12 + month;
                if (monthNum > totalMonths || remainingBalance <= 0) break;
                remainingBalance = Math.max(0, remainingBalance - principalPayment);
            }
        }
        loanBalances.push(remainingBalance);
    }

    return {
        loanAmount,
        interestRate,
        loanYears,
        monthlyPayment,
        annualPayments,
        loanBalances
    };
}

// キャッシュフロー計算
function calculateCashflow() {
    const holdingYears = parseInt(document.getElementById('holdingYears').value) || 10;
    const residenceStartYear = parseInt(document.getElementById('residenceStartYear').value) || 1;
    const residenceEndYear = parseInt(document.getElementById('residenceEndYear').value) || 3;
    
    const monthlyMaintenanceFee = parseFloat(document.getElementById('monthlyMaintenanceFee').value) || 0;
    const monthlyRepairReserve = parseFloat(document.getElementById('monthlyRepairReserve').value) || 0;
    const annualPropertyTax = parseFloat(document.getElementById('annualPropertyTax').value) || 0;
    const annualInsurance = parseFloat(document.getElementById('annualInsurance').value) || 0;
    const costIncreaseRate = parseFloat(document.getElementById('costIncreaseRate').value) || 0;
    
    const repairEventYear = parseInt(document.getElementById('repairEventYear').value) || 0;
    const repairEventCost = parseFloat(document.getElementById('repairEventCost').value) || 0;
    
    const loanDeduction = parseFloat(document.getElementById('loanDeduction').value) || 0;
    const deductionYears = parseInt(document.getElementById('deductionYears').value) || 0;
    
    const monthlyRent = parseFloat(document.getElementById('monthlyRent').value) || 0;
    const vacancyRate = parseFloat(document.getElementById('vacancyRate').value) || 0;
    const rentalManagementRate = parseFloat(document.getElementById('rentalManagementRate').value) || 0;
    const rentIncreaseRate = parseFloat(document.getElementById('rentIncreaseRate').value) || 0;
    
    const enableRentSaving = document.getElementById('enableRentSaving').checked;
    const monthlyRentSaving = parseFloat(document.getElementById('monthlyRentSaving').value) || 0;

    const loanInfo = calculationData.loanInfo;
    const yearlyCashflows = [];
    let totalRentalIncome = 0;
    let totalRentSaving = 0;

    for (let year = 1; year <= holdingYears; year++) {
        const isResidence = year >= residenceStartYear && year <= residenceEndYear;
        const costMultiplier = Math.pow(1 + costIncreaseRate / 100, year - 1);
        
        // 固定費用
        const maintenanceFee = monthlyMaintenanceFee * 12 * costMultiplier;
        const repairReserve = monthlyRepairReserve * 12 * costMultiplier;
        const propertyTax = annualPropertyTax * costMultiplier;
        const insurance = annualInsurance * costMultiplier;
        
        // 修繕イベント
        const repairCost = (year === repairEventYear) ? repairEventCost : 0;
        
        // ローン返済
        let loanPayment = 0;
        if (isLoanPurchase && loanInfo && year <= loanInfo.loanYears) {
            loanPayment = loanInfo.annualPayments[year - 1] || 0;
        }
        
        // 住宅ローン控除
        let deduction = 0;
        if (year <= deductionYears) {
            deduction = loanDeduction;
        }
        
        // 賃貸収入（非居住期間）
        let rentalIncome = 0;
        let rentalManagementFee = 0;
        if (!isResidence) {
            const rentMultiplier = Math.pow(1 + rentIncreaseRate / 100, year - residenceEndYear - 1);
            const effectiveRent = monthlyRent * rentMultiplier;
            rentalIncome = effectiveRent * 12 * (1 - vacancyRate / 100);
            rentalManagementFee = rentalIncome * (rentalManagementRate / 100);
            totalRentalIncome += rentalIncome - rentalManagementFee;
        }
        
        // 家賃節約（居住期間）
        let rentSaving = 0;
        if (isResidence && enableRentSaving) {
            rentSaving = monthlyRentSaving * 12;
            totalRentSaving += rentSaving;
        }
        
        // 年間ネットキャッシュフロー
        const netCashflow = rentalIncome - rentalManagementFee + rentSaving - maintenanceFee - 
                           repairReserve - propertyTax - insurance - repairCost - loanPayment + deduction;
        
        yearlyCashflows.push({
            year,
            isResidence,
            maintenanceFee,
            repairReserve,
            propertyTax,
            insurance,
            repairCost,
            loanPayment,
            deduction,
            rentalIncome: rentalIncome - rentalManagementFee,
            rentSaving,
            netCashflow
        });
    }

    return {
        yearlyCashflows,
        totalRentalIncome,
        totalRentSaving
    };
}

// 売却計算
function calculateSale() {
    const holdingYears = parseInt(document.getElementById('holdingYears').value) || 10;
    const salePriceMethod = document.getElementById('salePriceMethod').value;
    const purchasePrice = calculationData.initialCosts.purchasePrice;
    
    let salePrice = 0;
    if (salePriceMethod === 'direct') {
        salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    } else {
        const priceIncreaseRate = parseFloat(document.getElementById('priceIncreaseRate').value) || 0;
        salePrice = purchasePrice * Math.pow(1 + priceIncreaseRate / 100, holdingYears);
    }
    
    const saleBrokerageRate = parseFloat(document.getElementById('saleBrokerageRate').value) || 3;
    const otherSaleCost = parseFloat(document.getElementById('otherSaleCost').value) || 0;
    const saleTaxCost = parseFloat(document.getElementById('saleTaxCost').value) || 0;
    
    // 仲介手数料の計算（売却価格の3%+6万円、上限あり）
    const brokerageFee = Math.min(salePrice * (saleBrokerageRate / 100), salePrice * 0.03 + 60000);
    
    const totalSaleCosts = brokerageFee + otherSaleCost + saleTaxCost;
    
    // ローン残高の取得
    let loanBalance = 0;
    if (isLoanPurchase && calculationData.loanInfo) {
        const loanInfo = calculationData.loanInfo;
        if (holdingYears <= loanInfo.loanYears) {
            loanBalance = loanInfo.loanBalances[holdingYears - 1] || 0;
        }
    }
    
    const saleProceeds = salePrice - totalSaleCosts - loanBalance;
    
    return {
        salePrice,
        totalSaleCosts,
        loanBalance,
        saleProceeds
    };
}

// トータル損益計算
function calculateTotal() {
    const initialCost = calculationData.initialCosts.totalInitialCost;
    const cashflow = calculationData.cashflow;
    const sale = calculationData.sale;
    
    const totalHoldingCF = cashflow.yearlyCashflows.reduce((sum, cf) => sum + cf.netCashflow, 0);
    const totalProfit = initialCost + totalHoldingCF + sale.saleProceeds;
    
    // ブレークイーブン年の計算
    let cumulativeCF = -initialCost;
    let breakEvenYear = null;
    
    for (let i = 0; i < cashflow.yearlyCashflows.length; i++) {
        cumulativeCF += cashflow.yearlyCashflows[i].netCashflow;
        if (cumulativeCF >= 0 && breakEvenYear === null) {
            breakEvenYear = i + 1;
        }
    }
    
    // 売却を考慮した累積CF
    cumulativeCF += sale.saleProceeds;
    if (cumulativeCF >= 0 && breakEvenYear === null) {
        breakEvenYear = cashflow.yearlyCashflows.length;
    }
    
    return {
        totalProfit,
        totalHoldingCF,
        breakEvenYear,
        cumulativeCF
    };
}

// 初期費用表示更新
function updateInitialCostsDisplay() {
    const costs = calculationData.initialCosts;
    document.getElementById('totalContractFee').textContent = formatNumber(costs.totalContractFee);
    document.getElementById('totalSettlementFee').textContent = formatNumber(costs.totalSettlementFee);
    document.getElementById('totalLaterFee').textContent = formatNumber(costs.totalLaterFee);
    document.getElementById('totalInitialCost').textContent = formatNumber(costs.totalInitialCost);
}

// キャッシュフロー表示更新
function updateCashflowDisplay() {
    const cashflow = calculationData.cashflow;
    const canvas = document.getElementById('cashflowCanvas');
    const ctx = canvas.getContext('2d');
    
    // テーブル作成
    const table = document.getElementById('cashflowTable');
    let html = '<table><thead><tr>';
    html += '<th>年</th><th>ステータス</th><th>管理費</th><th>修繕積立</th><th>固定資産税</th>';
    html += '<th>保険</th><th>修繕イベント</th><th>ローン返済</th><th>控除</th>';
    html += '<th>賃貸収入</th><th>家賃節約</th><th>ネットCF</th>';
    html += '</tr></thead><tbody>';
    
    cashflow.yearlyCashflows.forEach(cf => {
        html += '<tr>';
        html += `<td>Year ${cf.year}</td>`;
        html += `<td><span class="status-badge ${cf.isResidence ? 'status-residence' : 'status-rental'}">${cf.isResidence ? '居住' : '賃貸'}</span></td>`;
        html += `<td>${formatNumber(cf.maintenanceFee)}</td>`;
        html += `<td>${formatNumber(cf.repairReserve)}</td>`;
        html += `<td>${formatNumber(cf.propertyTax)}</td>`;
        html += `<td>${formatNumber(cf.insurance)}</td>`;
        html += `<td>${formatNumber(cf.repairCost)}</td>`;
        html += `<td>${formatNumber(cf.loanPayment)}</td>`;
        html += `<td>${formatNumber(cf.deduction)}</td>`;
        html += `<td>${formatNumber(cf.rentalIncome)}</td>`;
        html += `<td>${formatNumber(cf.rentSaving)}</td>`;
        html += `<td class="${cf.netCashflow >= 0 ? 'positive' : 'negative'}">${formatNumber(cf.netCashflow)}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    table.innerHTML = html;
    
    // グラフ描画
    drawCashflowChart(canvas, cashflow.yearlyCashflows);
}

// 売却・トータル損益表示更新
function updateSaleDisplay() {
    const initialCost = calculationData.initialCosts.totalInitialCost;
    const cashflow = calculationData.cashflow;
    const sale = calculationData.sale;
    const total = calculationData.total;
    
    document.getElementById('summaryInitialCost').textContent = formatNumber(-initialCost);
    document.getElementById('summaryHoldingCF').textContent = formatNumber(total.totalHoldingCF);
    document.getElementById('summaryRentalIncome').textContent = formatNumber(cashflow.totalRentalIncome);
    document.getElementById('summaryRentSaving').textContent = formatNumber(cashflow.totalRentSaving);
    document.getElementById('summarySaleProceeds').textContent = formatNumber(sale.saleProceeds);
    document.getElementById('summaryTotalProfit').textContent = formatNumber(total.totalProfit);
    document.getElementById('summaryBreakEvenYear').textContent = total.breakEvenYear || '-';
    
    // 累積キャッシュフローグラフ
    const canvas = document.getElementById('cumulativeCanvas');
    drawCumulativeChart(canvas, calculationData);
}

// キャッシュフローグラフ描画
function drawCashflowChart(canvas, yearlyCashflows) {
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth - 40;
    const height = 400;
    canvas.width = width;
    canvas.height = height;
    
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.clearRect(0, 0, width, height);
    
    // データの準備
    const values = yearlyCashflows.map(cf => cf.netCashflow);
    const maxValue = Math.max(...values.map(Math.abs));
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    
    // グリッドと軸の描画
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // ゼロライン
    const zeroY = padding.top + chartHeight - (0 - minValue) / range * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    
    // バーの描画
    const barWidth = chartWidth / values.length * 0.8;
    const barSpacing = chartWidth / values.length;
    
    values.forEach((value, index) => {
        const x = padding.left + index * barSpacing + barSpacing * 0.1;
        const barHeight = Math.abs(value) / range * chartHeight;
        const y = value >= 0 
            ? zeroY - barHeight 
            : zeroY;
        
        ctx.fillStyle = value >= 0 ? '#28a745' : '#dc3545';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 年ラベル
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Y${index + 1}`, x + barWidth / 2, height - padding.bottom + 15);
    });
    
    // Y軸ラベル
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = minValue + (maxValue - minValue) * (i / 5);
        const y = padding.top + chartHeight - (value - minValue) / range * chartHeight;
        ctx.fillText(formatNumber(value), padding.left - 10, y + 4);
    }
}

// 累積キャッシュフローグラフ描画
function drawCumulativeChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth - 40;
    const height = 400;
    canvas.width = width;
    canvas.height = height;
    
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.clearRect(0, 0, width, height);
    
    // 累積CFの計算
    const initialCost = data.initialCosts.totalInitialCost;
    const cumulativeCFs = [];
    let cumulative = -initialCost;
    cumulativeCFs.push(cumulative);
    
    data.cashflow.yearlyCashflows.forEach(cf => {
        cumulative += cf.netCashflow;
        cumulativeCFs.push(cumulative);
    });
    
    // 売却を追加
    cumulative += data.sale.saleProceeds;
    cumulativeCFs.push(cumulative);
    
    const maxValue = Math.max(...cumulativeCFs.map(Math.abs));
    const minValue = Math.min(...cumulativeCFs);
    const range = maxValue - minValue || 1;
    
    // ゼロライン
    const zeroY = padding.top + chartHeight - (0 - minValue) / range * chartHeight;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    
    // 線の描画
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    cumulativeCFs.forEach((value, index) => {
        const x = padding.left + (index / (cumulativeCFs.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (value - minValue) / range * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // ポイントの描画
    cumulativeCFs.forEach((value, index) => {
        const x = padding.left + (index / (cumulativeCFs.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (value - minValue) / range * chartHeight;
        
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // ラベル
        if (index === 0 || index === cumulativeCFs.length - 1 || index % Math.ceil(cumulativeCFs.length / 5) === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(index === 0 ? '購入時' : index === cumulativeCFs.length - 1 ? '売却後' : `Y${index}`, x, height - padding.bottom + 15);
        }
    });
    
    // Y軸ラベル
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = minValue + (maxValue - minValue) * (i / 5);
        const y = padding.top + chartHeight - (value - minValue) / range * chartHeight;
        ctx.fillText(formatNumber(value), padding.left - 10, y + 4);
    }
}

// 数値フォーマット
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Math.round(num).toLocaleString('ja-JP');
}

// ウィンドウリサイズ時のグラフ再描画
window.addEventListener('resize', () => {
    if (calculationData.cashflow) {
        updateCashflowDisplay();
    }
    if (calculationData.total) {
        updateSaleDisplay();
    }
});
