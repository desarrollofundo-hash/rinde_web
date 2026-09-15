import { useRive } from "rive-react";

export default function RiveAnimation({
  src,
  stateMachine = null,
  className = "",
  onLoad = null,
  autoplay = true
}) {
  const { RiveComponent, rive } = useRive({
    src,
    stateMachines: stateMachine ? [stateMachine] : [],
    autoplay,
    onLoad,
  });

  return (
    <div className={className}>
      <RiveComponent />
    </div>
  );
}
