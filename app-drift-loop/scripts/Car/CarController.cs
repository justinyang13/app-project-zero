using Godot;

// Owns all car movement/drift math. Both PlayerInput.cs and AIDriver.cs feed
// input into ApplyInput() so there is exactly one implementation of the
// physics, regardless of who's driving.
public partial class CarController : CharacterBody3D
{
    [Export] public float Acceleration = 80f;
    [Export] public float MaxSpeed = 45f;
    [Export] public float ReverseSpeedFactor = 0.5f;
    [Export] public float TurnRate = 2.5f; // radians/sec at full speed
    [Export] public float Grip = 8f; // lateral velocity decay rate, normal traction
    [Export] public float DriftGrip = 1f; // lateral velocity decay rate while drifting
    [Export] public float Friction = 30f; // forward speed decay when no throttle

    private float _throttle;
    private float _steer;
    private bool _drifting;

    public void ApplyInput(float throttle, float steer, bool drift = false)
    {
        _throttle = Mathf.Clamp(throttle, -1f, 1f);
        _steer = Mathf.Clamp(steer, -1f, 1f);
        _drifting = drift;
    }

    public override void _PhysicsProcess(double delta)
    {
        float dt = (float)delta;

        // Turn rate scales with current speed so the car can't spin in
        // place, only while actually moving. Negated: Godot's +Y rotation
        // convention turns the local -Z forward vector toward -X, which
        // would otherwise make steer=+1 (right) turn the car left as seen
        // from the chase camera behind it.
        float speedRatio = Mathf.Clamp(Velocity.Length() / MaxSpeed, 0f, 1f);
        RotateY(-_steer * TurnRate * speedRatio * dt);

        Vector3 forward = -Transform.Basis.Z;
        Vector3 right = Transform.Basis.X;

        float forwardSpeed = Velocity.Dot(forward);
        float lateralSpeed = Velocity.Dot(right);

        forwardSpeed += _throttle * Acceleration * dt;
        if (Mathf.Abs(_throttle) < 0.01f)
        {
            forwardSpeed = Mathf.MoveToward(forwardSpeed, 0f, Friction * dt);
        }
        forwardSpeed = Mathf.Clamp(forwardSpeed, -MaxSpeed * ReverseSpeedFactor, MaxSpeed);

        // Exponential decay toward zero lateral velocity. A high Grip
        // damps sliding almost immediately (normal traction); a low
        // DriftGrip lets it persist, which reads as a slide.
        float grip = _drifting ? DriftGrip : Grip;
        lateralSpeed *= Mathf.Exp(-grip * dt);

        // forward/right are always horizontal (only RotateY is ever
        // applied), so Velocity.Y stays exactly 0 — no gravity needed on
        // this flat track.
        Velocity = forward * forwardSpeed + right * lateralSpeed;
        MoveAndSlide();
    }
}
