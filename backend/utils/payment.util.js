const DEPOSIT_RATE = 0.3;

function calcDepositAmount(tongTien) {
    const total = Math.round(Number(tongTien) || 0);
    const deposit = Math.round(total * DEPOSIT_RATE);
    return Math.max(1000, deposit);
}

function calcRemainAtCourt(tongTien, depositPaid = null) {
    const total = Math.round(Number(tongTien) || 0);
    const deposit = depositPaid != null ? Math.round(Number(depositPaid)) : calcDepositAmount(total);
    return Math.max(0, total - deposit);
}

module.exports = {
    DEPOSIT_RATE,
    calcDepositAmount,
    calcRemainAtCourt,
};
