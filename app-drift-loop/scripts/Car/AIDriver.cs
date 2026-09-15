using Godot;

// Steers toward a lookahead point sampled along a Path3D's baked curve,
// converting that into the same (throttle, steer) input PlayerInput.cs
// produces, fed into the shared CarController.
public partial class AIDriver : Node
{
    [Export] public NodePath RacingLinePath;
    [Export] public float LookaheadDistance = 10f;
    [Export] public float CruiseSpeed = 26f;

    private CarController _car;
    private Path3D _path;
    private float _progress;
    private bool _initialized;

    public override void _Ready()
    {
        _car = GetParent<CarController>();
        if (RacingLinePath != null && !RacingLinePath.IsEmpty)
        {
            _path = GetNode<Path3D>(RacingLinePath);
        }
    }

    public override void _PhysicsProcess(double delta)
    {
        if (_path?.Curve == null || _path.Curve.PointCount == 0)
        {
            return;
        }

        if (RaceManager.Instance == null || RaceManager.Instance.Phase != RaceManager.RacePhase.Racing)
        {
            _car.ApplyInput(0f, 0f, false);
            return;
        }

        Curve3D curve = _path.Curve;

        if (!_initialized)
        {
            Vector3 localPos = _path.ToLocal(_car.GlobalPosition);
            _progress = curve.GetClosestOffset(localPos);
            _initialized = true;
        }

        float bakedLength = curve.GetBakedLength();
        _progress = Mathf.PosMod(_progress + CruiseSpeed * (float)delta, bakedLength);

        Vector3 targetLocal = curve.SampleBaked(Mathf.PosMod(_progress + LookaheadDistance, bakedLength));
        Vector3 targetGlobal = _path.ToGlobal(targetLocal);

        Vector3 forward = -_car.Transform.Basis.Z;
        Vector3 toTarget = targetGlobal - _car.GlobalPosition;
        toTarget.Y = 0f;
        toTarget = toTarget.Normalized();

        float angleDiff = forward.SignedAngleTo(toTarget, Vector3.Up);

        // Negated to match CarController's negated RotateY convention.
        float steer = Mathf.Clamp(-angleDiff * 2.5f, -1f, 1f);
        float throttle = 1f - Mathf.Clamp(Mathf.Abs(angleDiff) / Mathf.Pi, 0f, 0.7f);

        // Never drift: a naive pursuit controller has no wall-awareness, and
        // letting lateral slide persist (low DriftGrip) through a hard
        // corner was carrying the AI sideways into the infield wall,
        // stalling it for over a second. Full grip keeps cornering
        // predictable. The player can still drift manually via Space.
        _car.ApplyInput(throttle, steer, false);
    }
}
