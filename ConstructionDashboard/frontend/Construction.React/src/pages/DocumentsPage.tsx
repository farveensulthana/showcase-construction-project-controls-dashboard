import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Page,
  Sort,
  Filter,
} from '@syncfusion/ej2-react-grids';
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Inject as PdfViewerInject,
} from '@syncfusion/ej2-react-pdfviewer';
import { projectsApi } from '../api/reports';
import type { RecentDocumentDto } from '../types';
import './DocumentsPage.css';

const SAMPLE_DOCUMENT_ID = 1;
const SAMPLE_PDF_URL = 'https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf';

export function DocumentsPage(): ReactElement {
  const [documents, setDocuments] = useState<RecentDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<RecentDocumentDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .getRecentDocuments(SAMPLE_DOCUMENT_ID, 365, 50)
      .then((data) => {
        if (!cancelled) {
          setDocuments(data);
          setSelectedDocument(data[0] ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load documents');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const gridData = useMemo(
    () =>
      documents.map((d) => ({
        id: d.id,
        documentNumber: d.documentNumber,
        title: d.title,
        type: d.type,
        revision: d.revision,
        submittedDate: d.submittedDate,
        status: d.status,
      })),
    [documents]
  );

  const rowSelected = useCallback((args: { data?: RecentDocumentDto }) => {
    if (args.data) {
      setSelectedDocument(args.data);
    }
  }, []);

  return (
    <div className='documents-page'>
      <header className='page-header'>
        <h1>Documents</h1>
        <p>RFIs, submittals, drawings, and specification documents</p>
      </header>

      {loading && <div className='loading-state' aria-live='polite'>Loading documents…</div>}
      {error && <div className='alert alert-error' role='alert'>{error}</div>}

      {!loading && !error && (
        <div className='documents-layout'>
          <div className='card document-list-card'>
            <GridComponent
              dataSource={gridData}
              allowPaging={true}
              allowSorting={true}
              allowFiltering={true}
              pageSettings={{ pageSize: 10 }}
              filterSettings={{ type: 'Menu' }}
              rowSelected={rowSelected}
              selectionSettings={{ mode: 'Row', type: 'Single' }}
            >
              <Inject services={[Page, Sort, Filter]} />
              <ColumnsDirective>
                <ColumnDirective field='documentNumber' headerText='Doc #' width='120' />
                <ColumnDirective field='title' headerText='Title' width='200' />
                <ColumnDirective field='type' headerText='Type' width='120' />
                <ColumnDirective field='revision' headerText='Rev' width='80' />
                <ColumnDirective field='submittedDate' headerText='Submitted' width='130' type='date' format='yMd' />
                <ColumnDirective field='status' headerText='Status' width='120' />
              </ColumnsDirective>
            </GridComponent>
          </div>

          <div className='card pdf-viewer-card'>
            <PdfViewerComponent
              id='document-pdf-viewer'
              documentPath={selectedDocument?.title ? SAMPLE_PDF_URL : SAMPLE_PDF_URL}
              resourceUrl='/ej2-pdfviewer-lib'
              style={{ height: '640px' }}
            >
              <PdfViewerInject
                services={[
                  Toolbar,
                  Magnification,
                  Navigation,
                  LinkAnnotation,
                  BookmarkView,
                  ThumbnailView,
                  Print,
                  TextSelection,
                  TextSearch,
                ]}
              />
            </PdfViewerComponent>
          </div>
        </div>
      )}
    </div>
  );
}
