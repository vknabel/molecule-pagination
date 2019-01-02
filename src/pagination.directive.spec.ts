import { PageLoader } from './page-source.class';
import { PaginationDirective } from './pagination.directive';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Observable, Subject, of, never, empty } from 'rxjs';

@Component({
  template: `
    <div *molPagination="itemsForPage; let items; ifLoading paginationLoading; ifEmpty paginationEmpty; loadNext loadNext">
      <p *ngFor="let item of items" testContent>{{item}}</p>
    </div>
    <ng-template #paginationEmpty>
      <p testEmpty>empty</p>
    </ng-template>
    <ng-template #paginationLoading>
      <p testLoading>loading</p>
    </ng-template>
  `
})
export class PaginationHostComponent<T> {
  @Input() public itemsForPage: PageLoader<T>;
  @Input() public loadNext: Observable<void>;
  @ViewChild(PaginationDirective)
  public paginationDirective: PaginationDirective<T>;
}

describe('pagination component', () => {
  let hostFixture: ComponentFixture<PaginationHostComponent<number>>;
  let host: PaginationHostComponent<number>;
  let sut: PaginationDirective<number>;

  beforeEach(
    async(() => {
      TestBed.configureTestingModule({
        imports: [CommonModule],
        declarations: [PaginationDirective, PaginationHostComponent]
      }).compileComponents();
    })
  );

  beforeEach(() => {
    hostFixture = TestBed.createComponent<PaginationHostComponent<number>>(PaginationHostComponent);
    host = hostFixture.componentInstance;
    sut = host.paginationDirective;
  });

  it('to be created', () => {
    expect(sut).toBeDefined();
  });

  it(
    'displays content when stable and having two pages',
    async(() => {
      host.itemsForPage = (page, forceReload) =>
        page === 0 ? of([1, 2, 3, 4]) : of([1]);
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testContent]')).length
        ).toEqual(4);
      });
    })
  );

  it(
    'displays content when stable and having two pages',
    async(() => {
      host.itemsForPage = (page, forceReload) =>
        page === 0 ? of([1, 2, 3, 4]) : of([1]);
      const loadNext = new Subject<void>();
      host.loadNext = loadNext.asObservable();
      hostFixture.detectChanges();
      loadNext.next(void 0);
      hostFixture.whenStable().then(() => {
        hostFixture.detectChanges();
        expect(
          hostFixture.debugElement.queryAll(By.css('[testContent]')).length
        ).toEqual(5);
      });
    })
  );

  it(
    'displays content when stable and having one page',
    async(() => {
      host.itemsForPage = (page, forceReload) => of([1, 2, 3]);
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testContent]')).length
        ).toEqual(3);
      });
    })
  );

  it(
    'displays empty when stable and empty',
    async(() => {
      host.itemsForPage = (page, forceReload) => of([]);
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testEmpty]')).length
        ).toEqual(1);
      });
    })
  );

  it(
    'displays loading when never emitted',
    async(() => {
      host.itemsForPage = (page, forceReload) => never();
      hostFixture.detectChanges();

      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testLoading]')).length
        ).toEqual(1);
      });
    })
  );

  it(
    'displays empty when only completing',
    async(() => {
      host.itemsForPage = (page, forceReload) => empty();
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testEmpty]')).length
        ).toEqual(1);
      });
    })
  );

  it(
    'picks the latest page loader',
    async(() => {
      host.itemsForPage = (page, forceReload) => of([1, 2, 3]);
      hostFixture.detectChanges();
      host.itemsForPage = (page, forceReload) => of([3]);
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testContent]')).length
        ).toEqual(1);
      });
    })
  );

  it(
    'ignores previous page loader',
    async(() => {
      host.itemsForPage = (page, forceReload) => of([1, 2, 3]);
      hostFixture.detectChanges();
      host.itemsForPage = (page, forceReload) => never();
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testContent]')).length
        ).toEqual(0);
      });
    })
  );

  it(
    'changing the page loader starts loading',
    async(() => {
      host.itemsForPage = (page, forceReload) => of([1, 2, 3]);
      hostFixture.detectChanges();
      host.itemsForPage = (page, forceReload) => never();
      hostFixture.detectChanges();
      hostFixture.whenStable().then(() => {
        expect(
          hostFixture.debugElement.queryAll(By.css('[testLoading]')).length
        ).toEqual(1);
      });
    })
  );
});
