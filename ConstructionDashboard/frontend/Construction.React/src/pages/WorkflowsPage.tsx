import type { ReactElement } from 'react';
import type { NodeModel, ConnectorModel } from '@syncfusion/ej2-react-diagrams';
import {
  DiagramComponent,
  Inject,
  UndoRedo,
  Snapping,
  SnapConstraints,
} from '@syncfusion/ej2-react-diagrams';
import './WorkflowsPage.css';

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
  {
    id: 'c3',
    sourceID: 'approved',
    targetID: 'distributed',
    annotations: [{ content: 'Yes', style: { fill: '#e8f5e9' } }],
  },
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

export function WorkflowsPage(): ReactElement {
  return (
    <div className='workflows-page'>
      <header className='page-header'>
        <h1>Workflows</h1>
        <p>Approval and delivery workflow visualization</p>
      </header>
      <div className='card workflow-diagram-card'>
        <DiagramComponent
          id='workflow-diagram'
          width='100%'
          height='500px'
          nodes={nodes}
          connectors={connectors}
          getNodeDefaults={(node: NodeModel) => ({
            ...node,
            style: { ...node.style, strokeWidth: 2 },
            annotations: node.annotations?.map((a) => ({
              ...a,
              style: { fontSize: 14, fontFamily: 'inherit' },
            })),
          })}
          snapSettings={{ constraints: SnapConstraints.ShowLines }}
        >
          <Inject services={[UndoRedo, Snapping]} />
        </DiagramComponent>
      </div>
    </div>
  );
}
