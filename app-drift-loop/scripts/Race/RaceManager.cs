using Godot;
using System.Collections.Generic;

// Autoload singleton (see project.godot [autoload]). Owns race-wide state
// that many decoupled nodes (checkpoints, the HUD, both cars) need to read
// or report to, so it's a global access point rather than something wired
// through NodePaths in the scene tree.
public partial class RaceManager : Node
{
    public static RaceManager Instance { get; private set; }

    public enum RacePhase { Idle, Countdown, Racing, Finished }

    [Export] public int TotalCheckpoints = 4;
    [Export] public int TotalLaps = 3;
    [Export] public float CountdownSeconds = 3f;

    public RacePhase Phase { get; private set; } = RacePhase.Idle;
    public float ElapsedTime { get; private set; }
    public float CountdownRemaining { get; private set; }

    private readonly Dictionary<Node, int> _nextExpected = new();
    private readonly Dictionary<Node, int> _lapCount = new();

    public override void _Ready()
    {
        Instance = this;
    }

    public override void _Process(double delta)
    {
        switch (Phase)
        {
            case RacePhase.Countdown:
                CountdownRemaining -= (float)delta;
                if (CountdownRemaining <= 0f)
                {
                    Phase = RacePhase.Racing;
                }
                break;
            case RacePhase.Racing:
                ElapsedTime += (float)delta;
                break;
        }
    }

    public void RegisterCar(Node car)
    {
        // Checkpoint 0 doubles as the start/finish line and is considered
        // already "passed" at the starting grid, so the next expected
        // checkpoint is 1.
        _nextExpected[car] = 1;
        _lapCount[car] = 0;
    }

    public void BeginCountdown()
    {
        ElapsedTime = 0f;
        CountdownRemaining = CountdownSeconds;
        Phase = RacePhase.Countdown;
    }

    // Only counts if checkpoints are hit in order, so driving backward
    // through the finish line or cutting to a later checkpoint can't be
    // used to farm laps.
    public void NotifyCheckpoint(Node car, int index)
    {
        if (Phase != RacePhase.Racing) return;
        if (!_nextExpected.ContainsKey(car)) RegisterCar(car);

        int expected = _nextExpected[car];

        if (index == 0)
        {
            if (expected >= TotalCheckpoints)
            {
                _lapCount[car]++;
                _nextExpected[car] = 1;
                GD.Print($"{car.Name} completed lap {_lapCount[car]} at {ElapsedTime:F2}s");

                if (_lapCount[car] >= TotalLaps && Phase != RacePhase.Finished)
                {
                    Phase = RacePhase.Finished;
                    GD.Print($"{car.Name} finished the race at {ElapsedTime:F2}s");
                }
            }
            return;
        }

        if (index == expected)
        {
            _nextExpected[car] = expected + 1;
        }
    }

    public int GetLapCount(Node car) => _lapCount.TryGetValue(car, out var laps) ? laps : 0;
}
