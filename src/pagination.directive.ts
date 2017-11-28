import {
  ChangeDetectorRef,
  Directive,
  EmbeddedViewRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/never';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/pluck';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/switch';
import 'rxjs/add/operator/mapTo';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/defaultIfEmpty';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mergeScan';
import { PageLoader, PageSource } from './page-source.class';

export class PaginationContext<T> {
  private page$: BehaviorSubject<number>;
  private items$: BehaviorSubject<T[] | null>;

  constructor(
    page$: BehaviorSubject<number>,
    items$: BehaviorSubject<T[] | null>
  ) {
    this.page$ = page$;
    this.items$ = items$;
  }

  public get $implicit(): T[] | null {
    return this.items$.getValue();
  }

  public get index(): number {
    return this.page$.getValue();
  }
}

@Directive({
  selector: '[molPagination]'
})
export class PaginationDirective<T> implements OnChanges, OnDestroy, OnInit {
  @Input()
  public set molPagination(loader: PageLoader<T>) {}
  @Input() public molPaginationIfLoading?: TemplateRef<PaginationContext<T>>;
  @Input() public molPaginationIfEmpty?: TemplateRef<PaginationContext<T>>;
  @Input() public molPaginationLoadNext: Observable<void>;
  @Input()
  public set molPaginationHardReload(hardReload$: Observable<void>) {}
  private readonly page$: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );
  private readonly items$: BehaviorSubject<T[] | null> = new BehaviorSubject<
    T[] | null
  >(null);
  private context: PaginationContext<T>;
  private fetchedViewRef: EmbeddedViewRef<PaginationContext<T>> | null = null;
  private loadingViewRef: EmbeddedViewRef<PaginationContext<T>> | null = null;
  private emptyViewRef: EmbeddedViewRef<PaginationContext<T>> | null = null;

  public readonly ngOnChanges$: Subject<SimpleChanges> = new ReplaySubject<
    SimpleChanges
  >();
  public readonly ngOnDestroy$: ReplaySubject<void> = new ReplaySubject<void>();

  public constructor(
    private readonly viewContainerRef: ViewContainerRef,
    private readonly templateRef: TemplateRef<PaginationContext<T>>,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    this.context = new PaginationContext<T>(this.page$, this.items$);
  }

  public ngOnInit(): void {
    const loadNext$ = this.ngOnChanges$
      .asObservable()
      .pluck('molPaginationLoadNext', 'currentValue')
      .mergeMap(
        (source: Observable<void>): Observable<void> =>
          source || Observable.empty<void>()
      );
    const hardReload$ = this.ngOnChanges$
      .asObservable()
      .pluck<SimpleChanges, Observable<void>>(
        'molPaginationHardReload',
        'currentValue'
      )
      .filter((v: Observable<void>) => v != null)
      .startWith<Observable<void>>(Observable.never<void>())
      .switch();
    const latestRequest$ = this.ngOnChanges$
      .asObservable()
      .pluck('molPagination', 'currentValue')
      .map((loader: PageLoader<T>) => PageSource.from(loader));

    const shouldLoadNext$ = Observable.merge(
      hardReload$.mapTo(false),
      loadNext$.mapTo(true)
    );

    latestRequest$
      .switchMap((pageSource: PageSource<T>) =>
        shouldLoadNext$
          .startWith(false)
          .mergeScan(
            (state, shouldLoadNext) => {
              if (shouldLoadNext) {
                const nextPage = state.currentPage + 1;
                return pageSource
                  .itemsForPage(nextPage, false)
                  .defaultIfEmpty([])
                  .map((newItems: T[]) => {
                    const copy = state.book.slice(0);
                    copy[nextPage] = newItems;
                    return {
                      currentPage:
                        newItems.length === 0 ? state.currentPage : nextPage,
                      book: copy
                    };
                  });
              } else {
                return pageSource
                  .itemsForPage(0, true)
                  .defaultIfEmpty([])
                  .map((initialItems: T[]) => {
                    return { currentPage: 0, book: [initialItems] };
                  });
              }
            },
            { currentPage: 0, book: [] as T[][] },
            1
          )
          .startWith(null)
      )
      .do(record => record && this.page$.next(record.currentPage))
      .map(record => record && record.book)
      .map(
        book =>
          book &&
          book.reduce((flattened, pageItems) => flattened.concat(pageItems), [])
      )
      .do(nextValue => this.items$.next(nextValue))
      .do(() => this.changeDetector.markForCheck())
      .do(items => {
        if (items == null) {
          if (!this.loadingViewRef) {
            this.viewContainerRef.clear();
            this.emptyViewRef = null;
            this.fetchedViewRef = null;
            if (this.molPaginationIfLoading) {
              this.loadingViewRef = this.viewContainerRef.createEmbeddedView(
                this.molPaginationIfLoading,
                this.context
              );
            }
          }
        } else if (items.length === 0) {
          if (!this.emptyViewRef) {
            this.viewContainerRef.clear();
            this.loadingViewRef = null;
            this.fetchedViewRef = null;
            if (this.molPaginationIfEmpty) {
              this.emptyViewRef = this.viewContainerRef.createEmbeddedView(
                this.molPaginationIfEmpty,
                this.context
              );
            }
          }
        } else {
          if (!this.fetchedViewRef) {
            this.viewContainerRef.clear();
            this.loadingViewRef = null;
            this.emptyViewRef = null;
            if (this.templateRef) {
              this.fetchedViewRef = this.viewContainerRef.createEmbeddedView(
                this.templateRef,
                this.context
              );
            }
          }
        }
      })
      .do(() => this.changeDetector.markForCheck())
      .takeUntil(this.ngOnDestroy$.asObservable())
      .subscribe();
  }

  public ngOnChanges(changes: SimpleChanges) {
    this.ngOnChanges$.next(changes);
  }

  public ngOnDestroy() {
    this.ngOnDestroy$.next(void 0);
    this.ngOnDestroy$.complete();
  }
}
