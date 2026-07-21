import { Component, OnInit, signal } from '@angular/core';
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import type { RowSelectEventArgs } from '@syncfusion/ej2-grids';
import { PdfViewerAllModule } from '@syncfusion/ej2-angular-pdfviewer';
import { ProjectsService } from '../../core/services/projects.service';
import type { RecentDocumentDto } from '../../core/models/api.models';

const SAMPLE_DOCUMENT_ID = 1;
const SAMPLE_PDF_URL = 'https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf';

@Component({
  selector: 'app-documents',
  imports: [GridAllModule, PdfViewerAllModule],
  templateUrl: './documents.html',
  styleUrl: './documents.css',
})
export class Documents implements OnInit {
  readonly sampleUrl = SAMPLE_PDF_URL;
  readonly pageSettings = { pageSize: 10 };
  readonly filterSettings = { type: 'Menu' as const };
  readonly selectionSettings = { mode: 'Row' as const, type: 'Single' as const };

  documents = signal<RecentDocumentDto[]>([]);
  selectedDocument = signal<RecentDocumentDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private projectsApi: ProjectsService) {}

  ngOnInit(): void {
    this.projectsApi.getRecentDocuments(SAMPLE_DOCUMENT_ID, 365, 50).subscribe({
      next: (data) => {
        this.documents.set(data);
        this.selectedDocument.set(data[0] ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load documents');
        this.loading.set(false);
      },
    });
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const data = args.data as RecentDocumentDto | undefined;
    if (data) this.selectedDocument.set(data);
  }
}
