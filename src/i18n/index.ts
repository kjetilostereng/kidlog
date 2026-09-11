import { createContext, useContext } from 'react';
import { nb, type Messages } from './nb';
import { en } from './en';
import type { BuiltinKey } from '../domain/types';
import type { BuiltinLabels } from '../domain/defaults';
import { ageParts, calendarDaysBetween, durationParts } from '../domain/time';

export const LOCALES = {
  nb: { messages: nb, tag: 'nb-NO', label: 'Norsk' },
  en: { messages: en, tag: 'en-GB', label: 'English' },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = 'nb';

export function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

export function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export class I18n {
  readonly m: Messages;
  readonly tag: string;
  private timeFmt: Intl.DateTimeFormat;
  private dayFmt: Intl.DateTimeFormat;
  private dateTimeFmt: Intl.DateTimeFormat;

  constructor(readonly locale: Locale) {
    this.m = LOCALES[locale].messages;
    this.tag = LOCALES[locale].tag;
    this.timeFmt = new Intl.DateTimeFormat(this.tag, { hour: '2-digit', minute: '2-digit' });
    this.dayFmt = new Intl.DateTimeFormat(this.tag, { weekday: 'long', day: 'numeric', month: 'short' });
    this.dateTimeFmt = new Intl.DateTimeFormat(this.tag, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  clock(ts: number): string {
    return this.timeFmt.format(ts);
  }

  /** Clock for today, otherwise date and clock. */
  clockOrDate(ts: number, now: number): string {
    return calendarDaysBetween(ts, now) === 0 ? this.clock(ts) : this.dateTimeFmt.format(ts);
  }

  dayHeading(ts: number, now: number): string {
    const diff = calendarDaysBetween(ts, now);
    if (diff === 0) return this.m.days.today;
    if (diff === 1) return this.m.days.yesterday;
    const text = this.dayFmt.format(ts);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  duration(ms: number): string {
    const { days, hours, minutes } = durationParts(ms);
    const d = this.m.duration;
    if (days > 0) return fill(d.daysHours, { d: days, h: hours });
    if (hours > 0) return minutes ? fill(d.hoursMinutes, { h: hours, m: minutes }) : fill(d.hours, { h: hours });
    if (minutes > 0) return fill(d.minutes, { m: minutes });
    return d.zero;
  }

  age(birthDate: string, now: number): string {
    const { years, months, weeks, days } = ageParts(birthDate, now);
    const a = this.m.age;
    if (years >= 2) return months ? fill(a.yearsMonths, { y: years, m: months }) : fill(a.years, { y: years });
    const totalMonths = years * 12 + months;
    if (totalMonths >= 1) return weeks ? fill(a.monthsWeeks, { m: totalMonths, w: weeks }) : fill(a.months, { m: totalMonths });
    if (weeks >= 1) {
      if (days) return fill(a.weeksDays, { w: weeks, d: days });
      return weeks === 1 ? a.week : fill(a.weeks, { w: weeks });
    }
    return days === 1 ? a.day : fill(a.days, { n: days });
  }

  builtinLabels(): BuiltinLabels {
    const b = this.m.builtin as Record<
      BuiltinKey,
      { name: string; fields?: Record<string, string>; options?: Record<string, Record<string, string>> }
    >;
    return {
      name: (key) => b[key].name,
      fieldLabel: (typeKey, fieldKey) => b[typeKey].fields?.[fieldKey] ?? fieldKey,
      optionLabel: (typeKey, fieldKey, option) => b[typeKey].options?.[fieldKey]?.[option] ?? option,
    };
  }
}

export const I18nContext = createContext<I18n>(new I18n(DEFAULT_LOCALE));

export function useI18n(): I18n {
  return useContext(I18nContext);
}
