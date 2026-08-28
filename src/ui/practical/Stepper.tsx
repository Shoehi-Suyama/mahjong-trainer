interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  suffix?: string;
}

export default function Stepper({ value, min = 0, max = 99, onChange, suffix }: StepperProps) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="減らす">
        −
      </button>
      <span className="stepper-val">
        {value}
        {suffix}
      </span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="増やす">
        ＋
      </button>
    </span>
  );
}
