using Godot;

// Attached to Checkpoint.tscn (Area3D). Index is set per-instance in the
// track scene (0 = start/finish line).
public partial class CheckpointArea : Area3D
{
    [Export] public int Index;

    public override void _Ready()
    {
        BodyEntered += OnBodyEntered;
    }

    private void OnBodyEntered(Node3D body)
    {
        if (body is CarController)
        {
            RaceManager.Instance?.NotifyCheckpoint(body, Index);
        }
    }
}
