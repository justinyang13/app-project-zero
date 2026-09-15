using Godot;

public partial class Hud : CanvasLayer
{
    [Export] public NodePath PlayerCarPath;

    private Label _statusLabel;
    private Node _playerCar;

    public override void _Ready()
    {
        _statusLabel = GetNode<Label>("StatusLabel");
        if (PlayerCarPath != null && !PlayerCarPath.IsEmpty)
        {
            _playerCar = GetNode(PlayerCarPath);
        }
    }

    public override void _Process(double delta)
    {
        var rm = RaceManager.Instance;
        if (rm == null) return;

        switch (rm.Phase)
        {
            case RaceManager.RacePhase.Idle:
                _statusLabel.Text = "";
                break;
            case RaceManager.RacePhase.Countdown:
                _statusLabel.Text = $"Get ready: {Mathf.CeilToInt(rm.CountdownRemaining)}";
                break;
            case RaceManager.RacePhase.Racing:
                int laps = _playerCar != null ? rm.GetLapCount(_playerCar) : 0;
                _statusLabel.Text = $"Lap {laps}/{rm.TotalLaps}   Time: {rm.ElapsedTime:F1}s";
                break;
            case RaceManager.RacePhase.Finished:
                _statusLabel.Text = $"Finished! Time: {rm.ElapsedTime:F1}s";
                break;
        }
    }
}
