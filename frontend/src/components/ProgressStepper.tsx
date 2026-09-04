export function ProgressStepper({current}: {current: number}) {
  const steps = ['Connect wallet', 'Create reserve', 'Submit erratum', 'Wait for decision', 'Use credit'];
  return (
    <ol className="stepper" aria-label="Reserve workflow progress">
      {steps.map((step, index) => (
        <li key={step} aria-current={index + 1 === current ? 'step' : undefined}>
          <span>Step {index + 1} of {steps.length}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}
