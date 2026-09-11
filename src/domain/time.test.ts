import { describe, expect, it } from 'vitest';
import { ageParts, calendarDaysBetween, durationParts, HOUR, MINUTE, DAY } from './time';
import { I18n } from '../i18n';

describe('durationParts', () => {
  it('splits milliseconds into days, hours and minutes', () => {
    expect(durationParts(45 * MINUTE)).toEqual({ days: 0, hours: 0, minutes: 45 });
    expect(durationParts(HOUR + 5 * MINUTE)).toEqual({ days: 0, hours: 1, minutes: 5 });
    expect(durationParts(DAY + 2 * HOUR)).toEqual({ days: 1, hours: 2, minutes: 0 });
    expect(durationParts(-5)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});

describe('ageParts', () => {
  it('computes months and weeks', () => {
    const now = new Date(2026, 8, 11).getTime();
    expect(ageParts('2026-05-01', now)).toEqual({ years: 0, months: 4, weeks: 1, days: 3 });
    expect(ageParts('2026-09-11', now)).toEqual({ years: 0, months: 0, weeks: 0, days: 0 });
    expect(ageParts('2024-03-20', now)).toEqual({ years: 2, months: 5, weeks: 3, days: 1 });
  });
});

describe('calendarDaysBetween', () => {
  it('counts local calendar days', () => {
    const a = new Date(2026, 8, 10, 23, 30).getTime();
    const b = new Date(2026, 8, 11, 0, 15).getTime();
    expect(calendarDaysBetween(a, b)).toBe(1);
  });
});

describe('I18n formatting', () => {
  const i18n = new I18n('nb');
  it('formats durations', () => {
    expect(i18n.duration(0)).toBe('0m');
    expect(i18n.duration(45 * MINUTE)).toBe('45m');
    expect(i18n.duration(HOUR + 5 * MINUTE)).toBe('1t 5m');
    expect(i18n.duration(3 * HOUR)).toBe('3t');
    expect(i18n.duration(DAY + 2 * HOUR)).toBe('1d 2t');
  });
  it('formats ages', () => {
    const now = new Date(2026, 8, 11).getTime();
    expect(i18n.age('2026-05-01', now)).toBe('4 mnd 1 u');
    expect(i18n.age('2026-09-04', now)).toBe('1 uke');
    expect(i18n.age('2026-09-10', now)).toBe('1 dag');
    expect(i18n.age('2024-03-20', now)).toBe('2 år 5 mnd');
  });
  it('labels today and yesterday', () => {
    const now = new Date(2026, 8, 11, 12).getTime();
    expect(i18n.dayHeading(now - 3 * HOUR, now)).toBe('I dag');
    expect(i18n.dayHeading(now - 13 * HOUR, now)).toBe('I går');
  });
});
