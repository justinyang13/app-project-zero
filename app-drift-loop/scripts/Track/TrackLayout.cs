using Godot;

// Attached to TestTrack.tscn's root. Builds the AI racing line procedurally
// (rather than hand-serializing a Curve3D resource in the .tscn, which is
// fragile to author outside the editor), registers both cars with
// RaceManager, and kicks off the pre-race countdown.
public partial class TrackLayout : Node3D
{
    [Export] public NodePath PlayerCarPath = "PlayerCarInstance";
    [Export] public NodePath AiCarPath = "AICarInstance";

    public override void _Ready()
    {
        var path = GetNode<Path3D>("AILine");
        var curve = new Curve3D();
        // Centerline of the ring between the outer wall and the infield
        // block defined in TestTrack.tscn, closed by repeating the first
        // point.
        curve.AddPoint(new Vector3(40, 0, 22.5f));
        curve.AddPoint(new Vector3(40, 0, -22.5f));
        curve.AddPoint(new Vector3(-40, 0, -22.5f));
        curve.AddPoint(new Vector3(-40, 0, 22.5f));
        curve.AddPoint(new Vector3(40, 0, 22.5f));
        path.Curve = curve;

        var playerCar = GetNode(PlayerCarPath);
        var aiCar = GetNode(AiCarPath);

        RaceManager.Instance.RegisterCar(playerCar);
        RaceManager.Instance.RegisterCar(aiCar);
        RaceManager.Instance.BeginCountdown();
    }
}
