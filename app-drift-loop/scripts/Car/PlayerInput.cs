using Godot;

// Reads raw keyboard state and feeds it into the sibling CarController.
// Uses Input.IsKeyPressed directly (not the InputMap) to avoid depending on
// a hand-authored project.godot [input] section — remap via the editor's
// Input Map later if this needs to become configurable.
public partial class PlayerInput : Node
{
    private CarController _car;

    public override void _Ready()
    {
        _car = GetParent<CarController>();
    }

    public override void _PhysicsProcess(double delta)
    {
        if (RaceManager.Instance == null || RaceManager.Instance.Phase != RaceManager.RacePhase.Racing)
        {
            _car.ApplyInput(0f, 0f, false);
            return;
        }

        float throttle = 0f;
        if (Input.IsKeyPressed(Key.W) || Input.IsKeyPressed(Key.Up)) throttle += 1f;
        if (Input.IsKeyPressed(Key.S) || Input.IsKeyPressed(Key.Down)) throttle -= 1f;

        float steer = 0f;
        if (Input.IsKeyPressed(Key.D) || Input.IsKeyPressed(Key.Right)) steer += 1f;
        if (Input.IsKeyPressed(Key.A) || Input.IsKeyPressed(Key.Left)) steer -= 1f;

        bool drift = Input.IsKeyPressed(Key.Space);

        _car.ApplyInput(throttle, steer, drift);
    }
}
