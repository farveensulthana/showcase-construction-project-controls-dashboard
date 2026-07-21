import { Component } from '@angular/core';
import { DiagramAllModule, NodeModel, ConnectorModel, SnapConstraints } from '@syncfusion/ej2-angular-diagrams';

const nodes: NodeModel[] = [
  {
    id: 'submitted',
    offsetX: 150,
    offsetY: 100,
    width: 140,
    height: 50,
    shape: { type: 'Flow', shape: 'Terminator' },
    style: { fill: '#e3f2fd', strokeColor: '#1976d2' },
    annotations: [{ content: 'Submittal Created' }],
  },
  {
    id: 'review',
    offsetX: 400,
    offsetY: 100,
    width: 160,
    height: 50,
    shape: { type: 'Flow', shape: 'Process' },
    style: { fill: '#fff8e1', strokeColor: '#f9a825' },
    annotations: [{ content: 'Project Manager Review' }],
  },
  {
    id: 'approved',
    offsetX: 650,
    offsetY: 100,
    width: 140,
    height: 50,
    shape: { type: 'Flow', shape: 'Decision' },
    style: { fill: '#e8f5e9', strokeColor: '#388e3c' },
    annotations: [{ content: 'Approved?' }],
  },
  {
    id: 'returned',
    offsetX: 650,
    offsetY: 250,
    width: 140,
    height: 50,
    shape: { type: 'Flow', shape: 'Process' },
    style: { fill: '#ffebee', strokeColor: '#d32f2f' },
    annotations: [{ content: 'Returned' }],
  },
  {
    id: 'distributed',
    offsetX: 900,
    offsetY: 100,
    width: 160,
    height: 50,
    shape: { type: 'Flow', shape: 'Process' },
    style: { fill: '#e3f2fd', strokeColor: '#1976d2' },
    annotations: [{ content: 'Distributed to Site' }],
  },
  {
    id: 'complete',
    offsetX: 1150,
    offsetY: 100,
    width: 140,
    height: 50,
    shape: { type: 'Flow', shape: 'Terminator' },
    style: { fill: '#e8f5e9', strokeColor: '#388e3c' },
    annotations: [{ content: 'Completed' }],
  },
];

const connectors: ConnectorModel[] = [
  { id: 'c1', sourceID: 'submitted', targetID: 'review' },
  { id: 'c2', sourceID: 'review', targetID: 'approved' },
  { id: 'c3', sourceID: 'approved', targetID: 'distributed', annotations: [{ content: 'Yes', style: { fill: '#e8f5e9' } }] },
  {
    id: 'c4',
    sourceID: 'approved',
    targetID: 'returned',
    sourcePortID: 'bottom',
    targetPortID: 'top',
    annotations: [{ content: 'No', style: { fill: '#ffebee' } }],
  },
  { id: 'c5', sourceID: 'returned', targetID: 'review' },
  { id: 'c6', sourceID: 'distributed', targetID: 'complete' },
];

@Component({
  selector: 'app-workflows',
  imports: [DiagramAllModule],
  templateUrl: './workflows.html',
  styleUrl: './workflows.css',
})
export class Workflows {
  readonly nodes = nodes;
  readonly connectors = connectors;
  readonly snapSettings = { constraints: SnapConstraints.ShowLines };

  getNodeDefaults(node: NodeModel): NodeModel {
    return {
      ...node,
      style: { ...node.style, strokeWidth: 2 },
      annotations: node.annotations?.map((a) => ({ ...a, style: { fontSize: 14, fontFamily: 'inherit' } })),
    };
  }
}
