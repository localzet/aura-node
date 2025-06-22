/**
 * Преобразует число в краткую строковую форму.
 *
 * Эта функция принимает число и преобразует его в строку с суффиксом
 * ('K' для тысяч, 'M' для миллионов), если число достаточно велико.
 *
 * @param {number} num - Число для преобразования.
 * @returns {string} Краткая строковая форма числа.
 */
export const getShortNumberFromNumber = (num: number): string => {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
    } else if (num >= 1_000) {
        return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K';
    } else {
        return num.toString();
    }
};
