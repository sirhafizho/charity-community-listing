"use client";

import { useEffect, useMemo, useState } from "react";

type RelativeTimeProps = {
  date: string | Date;
  className?: string;
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "always",
});

const absoluteDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getRelativeLabel(input: string | Date, now: number) {
  const value = new Date(input);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const differenceInSeconds = Math.round((value.getTime() - now) / 1000);
  const absoluteSeconds = Math.abs(differenceInSeconds);

  if (absoluteSeconds < 60) {
    return "just now";
  }

  const differenceInMinutes = Math.round(differenceInSeconds / 60);

  if (Math.abs(differenceInMinutes) < 60) {
    return relativeTimeFormatter
      .format(differenceInMinutes, "minute")
      .replace(" minutes", " min")
      .replace(" minute", " min");
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);

  if (Math.abs(differenceInHours) < 24) {
    return relativeTimeFormatter.format(differenceInHours, "hour");
  }

  const differenceInDays = Math.round(differenceInHours / 24);

  if (Math.abs(differenceInDays) < 7) {
    return relativeTimeFormatter.format(differenceInDays, "day");
  }

  return absoluteDateFormatter.format(value);
}

export default function RelativeTime({ date, className }: RelativeTimeProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const label = useMemo(() => getRelativeLabel(date, currentTime), [currentTime, date]);

  const dateTime = useMemo(() => {
    const value = new Date(date);
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }, [date]);

  return (
    <time dateTime={dateTime} className={className}>
      {label || "—"}
    </time>
  );
}
