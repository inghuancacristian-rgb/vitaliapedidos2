import { describe, it, expect } from 'vitest';
import { formatCurrency, parsePrice, parseInputAmount } from './currency';

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('debería formatear centavos correctamente', () => {
      expect(formatCurrency(5000)).toBe('Bs. 50,00');
      expect(formatCurrency(15050)).toBe('Bs. 150,50');
      expect(formatCurrency(0)).toBe('Bs. 0,00');
    });

    it('debería manejar montos grandes con separadores de miles', () => {
      // Nota: Dependiendo de la versión de Node, el separador de miles en es-BO puede ser un punto
      // Por ejemplo "Bs. 1.500,00"
      const formatted = formatCurrency(150000);
      expect(formatted).toMatch(/Bs\.\s1\.500,00/);
    });
  });

  describe('parsePrice', () => {
    it('debería convertir un número entero a centavos', () => {
      expect(parsePrice('50')).toBe(5000);
      expect(parsePrice('0')).toBe(0);
    });

    it('debería convertir decimales con punto a centavos', () => {
      expect(parsePrice('50.50')).toBe(5050);
      expect(parsePrice('50.5')).toBe(5050); // Debería entender 50 centavos, no 5
      expect(parsePrice('50.05')).toBe(5005);
    });

    it('debería convertir decimales con coma a centavos', () => {
      expect(parsePrice('50,50')).toBe(5050);
      expect(parsePrice('50,5')).toBe(5050);
      expect(parsePrice('50,05')).toBe(5005);
    });

    it('debería ignorar letras u otros caracteres (sanitización)', () => {
      expect(parsePrice('Bs. 50.50')).toBe(5050);
      expect(parsePrice('abc50xyz.50')).toBe(5050);
    });
  });

  describe('parseInputAmount', () => {
    it('debería manejar números directos', () => {
      expect(parseInputAmount(50)).toBe(50);
      expect(parseInputAmount(0)).toBe(0);
    });

    it('debería manejar strings simples', () => {
      expect(parseInputAmount('50')).toBe(50);
    });

    it('debería convertir comas a puntos', () => {
      expect(parseInputAmount('50,5')).toBe(50.5);
      expect(parseInputAmount('50,50')).toBe(50.5);
    });

    it('debería mantener puntos decimales', () => {
      expect(parseInputAmount('50.5')).toBe(50.5);
      expect(parseInputAmount('50.50')).toBe(50.5);
    });

    it('debería retornar 0 para valores inválidos', () => {
      expect(parseInputAmount('')).toBe(0);
      expect(parseInputAmount('abc')).toBe(0);
    });
  });
});
