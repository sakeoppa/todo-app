'use client';

import { useEffect, useState, useCallback } from 'react';
import SunCalc from 'suncalc';

type Mode = 'light' | 'dark' | 'auto';

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

function isDarkByLocation(lat: number, lng: number): boolean {
  const now = new Date();
  const times = SunCalc.getTimes(now, lat, lng);
  return now < times.sunrise || now > times.sunset;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light');
  const [locError, setLocError] = useState(false);

  const applyAuto = useCallback((lat: number, lng: number) => {
    applyDark(isDarkByLocation(lat, lng));
  }, []);

  useEffect(() => {
    const stored = (localStorage.getItem('theme') ?? 'system') as Mode | 'system';
    if (stored === 'auto') {
      setMode('auto');
      const lat = parseFloat(localStorage.getItem('theme-lat') ?? '');
      const lng = parseFloat(localStorage.getItem('theme-lng') ?? '');
      if (!isNaN(lat) && !isNaN(lng)) {
        applyAuto(lat, lng);
      }
    } else {
      const isDark =
        stored === 'dark' ||
        (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setMode(isDark ? 'dark' : 'light');
      applyDark(isDark);
    }
  }, [applyAuto]);

  // 1분마다 auto 모드 재계산
  useEffect(() => {
    if (mode !== 'auto') return;
    const lat = parseFloat(localStorage.getItem('theme-lat') ?? '');
    const lng = parseFloat(localStorage.getItem('theme-lng') ?? '');
    if (isNaN(lat) || isNaN(lng)) return;
    const id = setInterval(() => applyAuto(lat, lng), 60_000);
    return () => clearInterval(id);
  }, [mode, applyAuto]);

  function toggleDark() {
    if (mode === 'auto') return;
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    applyDark(next === 'dark');
    localStorage.setItem('theme', next);
  }

  function toggleAuto(checked: boolean) {
    if (!checked) {
      setMode('light');
      applyDark(false);
      localStorage.setItem('theme', 'light');
      setLocError(false);
      return;
    }

    // 타임존 기반 좌표만 사용 (권한 요청 안 함)
    const offsetHours = -new Date().getTimezoneOffset() / 60;
    const lat = 37.0;
    const lng = offsetHours * 15;
    localStorage.setItem('theme-lat', String(lat));
    localStorage.setItem('theme-lng', String(lng));
    localStorage.setItem('theme', 'auto');
    setMode('auto');
    setLocError(false);
    applyAuto(lat, lng);
  }

  const isDark = mode === 'dark' || (mode === 'auto' && document.documentElement.classList.contains('dark'));

  return (
    <div className="space-y-3">
      {/* 메인 토글 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold">다크 모드</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">화면 테마를 밝게 또는 어둡게 설정합니다.</p>
        </div>
        <button
          onClick={toggleDark}
          disabled={mode === 'auto'}
          title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.05 3.05l1.06 1.06M10.9 10.9l1.06 1.06M3.05 11.95l1.06-1.06M10.9 4.1l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12.5 9A6 6 0 015 1.5a6 6 0 100 11A6 6 0 0012.5 9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* 일출·일몰 자동 전환 */}
      <div className="flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 dark:bg-gray-800/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            일출·일몰에 맞춰 자동 전환
            {locError && (
              <span className="ml-1.5 text-red-400">위치 권한 필요</span>
            )}
          </span>
          <input
            type="checkbox"
            checked={mode === 'auto'}
            onChange={(e) => toggleAuto(e.target.checked)}
            className="h-3.5 w-3.5 accent-blue-600"
          />
        </label>
      </div>
    </div>
  );
}
