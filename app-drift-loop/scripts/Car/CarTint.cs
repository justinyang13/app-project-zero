using Godot;

// Tints every mesh surface under this node by multiplying the shared Kenney
// car texture's albedo, so the same model can be recolored per-instance
// (blue for the player, red for the AI) without forking the asset.
public partial class CarTint : Node3D
{
    [Export] public Color Tint = Colors.White;

    public override void _Ready()
    {
        ApplyTint(this);
    }

    private void ApplyTint(Node node)
    {
        if (node is MeshInstance3D meshInstance && meshInstance.Mesh != null)
        {
            for (int i = 0; i < meshInstance.Mesh.GetSurfaceCount(); i++)
            {
                if (meshInstance.Mesh.SurfaceGetMaterial(i) is StandardMaterial3D baseMat)
                {
                    var tinted = (StandardMaterial3D)baseMat.Duplicate();
                    tinted.AlbedoColor = Tint;
                    meshInstance.SetSurfaceOverrideMaterial(i, tinted);
                }
            }
        }

        foreach (Node child in node.GetChildren())
        {
            ApplyTint(child);
        }
    }
}
