using Godot;

// Procedurally scatters Kenney Nature Kit rock/cactus models around the
// track — a distant ring of scaled-up formations for a canyon backdrop,
// plus smaller clutter just outside the walls — rather than hand-placing
// dozens of nodes in the .tscn, which would be tedious and error-prone to
// author by hand. Deterministic (fixed seed) so the layout is stable
// across runs.
public partial class SceneryScatter : Node3D
{
    private static readonly string[] FormationModels =
    {
        "res://assets/models/nature/rock_largeA.glb",
        "res://assets/models/nature/rock_largeC.glb",
        "res://assets/models/nature/rock_largeE.glb",
        "res://assets/models/nature/rock_tallA.glb",
        "res://assets/models/nature/rock_tallD.glb",
        "res://assets/models/nature/rock_tallG.glb",
        "res://assets/models/nature/cliff_rock.glb",
    };

    private static readonly string[] ClutterModels =
    {
        "res://assets/models/nature/rock_largeC.glb",
        "res://assets/models/nature/rock_largeE.glb",
        "res://assets/models/nature/cactus_short.glb",
        "res://assets/models/nature/cactus_tall.glb",
    };

    public override void _Ready()
    {
        var rng = new RandomNumberGenerator();
        rng.Seed = 1337;

        var formations = new PackedScene[FormationModels.Length];
        for (int i = 0; i < FormationModels.Length; i++)
        {
            formations[i] = GD.Load<PackedScene>(FormationModels[i]);
        }

        var clutter = new PackedScene[ClutterModels.Length];
        for (int i = 0; i < ClutterModels.Length; i++)
        {
            clutter[i] = GD.Load<PackedScene>(ClutterModels[i]);
        }

        // Distant canyon backdrop: a ring of scaled-up rock formations well
        // outside the drivable area.
        for (int i = 0; i < 16; i++)
        {
            float angle = i * (Mathf.Tau / 16f) + rng.RandfRange(-0.15f, 0.15f);
            float radius = rng.RandfRange(75f, 105f);
            var scene = formations[rng.RandiRange(0, formations.Length - 1)];
            SpawnInstance(scene, angle, radius, rng.RandfRange(7f, 14f), rng.RandfRange(0f, Mathf.Tau));
        }

        // Near clutter: smaller rocks/cacti just outside the walls.
        for (int i = 0; i < 14; i++)
        {
            float angle = rng.RandfRange(0f, Mathf.Tau);
            float radius = rng.RandfRange(56f, 68f);
            var scene = clutter[rng.RandiRange(0, clutter.Length - 1)];
            SpawnInstance(scene, angle, radius, rng.RandfRange(1f, 2.2f), rng.RandfRange(0f, Mathf.Tau));
        }
    }

    private void SpawnInstance(PackedScene scene, float angle, float radius, float scale, float yaw)
    {
        var instance = scene.Instantiate<Node3D>();
        AddChild(instance);
        instance.Position = new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);
        instance.Scale = Vector3.One * scale;
        instance.RotateY(yaw);
    }
}
