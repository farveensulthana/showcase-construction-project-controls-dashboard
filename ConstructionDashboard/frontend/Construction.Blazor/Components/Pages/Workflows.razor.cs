using Microsoft.AspNetCore.Components;
using Syncfusion.Blazor.Diagram;

namespace Construction.Blazor.Components.Pages;

public partial class Workflows : ComponentBase
{
    private readonly DiagramObjectCollection<Node> _nodes = [];
    private readonly DiagramObjectCollection<Connector> _connectors = [];

    protected override void OnInitialized()
    {
        _nodes.Add(new Node
        {
            ID = "submitted", OffsetX = 150, OffsetY = 100, Width = 140, Height = 50,
            Shape = new FlowShape { Shape = NodeFlowShapes.Terminator },
            Style = new ShapeStyle { Fill = "#e3f2fd", StrokeColor = "#1976d2" },
            Annotations = [new ShapeAnnotation { Content = "Submittal Created" }],
        });
        _nodes.Add(new Node
        {
            ID = "review", OffsetX = 400, OffsetY = 100, Width = 160, Height = 50,
            Shape = new FlowShape { Shape = NodeFlowShapes.Process },
            Style = new ShapeStyle { Fill = "#fff8e1", StrokeColor = "#f9a825" },
            Annotations = [new ShapeAnnotation { Content = "Project Manager Review" }],
        });
        _nodes.Add(new Node
        {
            ID = "approved", OffsetX = 650, OffsetY = 100, Width = 140, Height = 50,
            Shape = new FlowShape { Shape = NodeFlowShapes.Decision },
            Style = new ShapeStyle { Fill = "#e8f5e9", StrokeColor = "#388e3c" },
            Annotations = [new ShapeAnnotation { Content = "Approved?" }],
        });
        _nodes.Add(new Node
        {
            ID = "returned", OffsetX = 650, OffsetY = 250, Width = 140, Height = 50,
            Shape = new FlowShape { Shape = NodeFlowShapes.Process },
            Style = new ShapeStyle { Fill = "#ffebee", StrokeColor = "#d32f2f" },
            Annotations = [new ShapeAnnotation { Content = "Returned" }],
        });
        _nodes.Add(new Node
        {
            ID = "distributed", OffsetX = 900, OffsetY = 100, Width = 160, Height = 50,
            Shape = new FlowShape { Shape = NodeFlowShapes.Process },
            Style = new ShapeStyle { Fill = "#e3f2fd", StrokeColor = "#1976d2" },
            Annotations = [new ShapeAnnotation { Content = "Distributed to Site" }],
        });
        _nodes.Add(new Node
        {
            ID = "complete", OffsetX = 1150, OffsetY = 100, Width = 140, Height = 50,
            Shape = new FlowShape { Shape = NodeFlowShapes.Terminator },
            Style = new ShapeStyle { Fill = "#e8f5e9", StrokeColor = "#388e3c" },
            Annotations = [new ShapeAnnotation { Content = "Completed" }],
        });

        _connectors.Add(new Connector { ID = "c1", SourceID = "submitted", TargetID = "review" });
        _connectors.Add(new Connector { ID = "c2", SourceID = "review", TargetID = "approved" });
        _connectors.Add(new Connector
        {
            ID = "c3", SourceID = "approved", TargetID = "distributed",
            Annotations = [new PathAnnotation { Content = "Yes", Style = new TextStyle { Fill = "#e8f5e9" } }],
        });
        _connectors.Add(new Connector
        {
            ID = "c4", SourceID = "approved", TargetID = "returned",
            Annotations = [new PathAnnotation { Content = "No", Style = new TextStyle { Fill = "#ffebee" } }],
        });
        _connectors.Add(new Connector { ID = "c5", SourceID = "returned", TargetID = "review" });
        _connectors.Add(new Connector { ID = "c6", SourceID = "distributed", TargetID = "complete" });
    }
}
