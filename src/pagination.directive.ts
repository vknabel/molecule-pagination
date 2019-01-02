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
import { PageLoader, PageSource } from './page-source.class';
import {
  BehaviorSubject,
  Observable,
  Subject,
  ReplaySubject,
  empty,
  never,
  merge as mergeObservables
} from 'rxjs';
import {
  pluck,
  mergeMap,
  filter,
  startWith,
  switchAll,
  map,
  mapTo,
  switchMap,
  mergeScan,
  tap,
  takeUntil,
  defaultIfEmpty
} from 'rxjs/operators';

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
    const loadNext$ = this.ngOnChanges$.pipe(
      pluck('molPaginationLoadNext', 'currentValue'),
      mergeMap(
        (source: Observable<void>): Observable<void> => source || empty()
      )
    );
    const hardReload$ = this.ngOnChanges$.pipe(
      pluck<SimpleChanges, Observable<void>>(
        'molPaginationHardReload',
        'currentValue'
      ),
      filter((v: Observable<void>) => v != null),
      startWith<Observable<void>>(never()),
      switchAll()
    );
    const latestRequest$ = this.ngOnChanges$.pipe(
      pluck('molPagination', 'currentValue'),
      map((loader: PageLoader<T>) => PageSource.from(loader))
    );

    const shouldLoadNext$ = mergeObservables(
      hardReload$.pipe(mapTo(false)),
      loadNext$.pipe(mapTo(true))
    );

    latestRequest$
      .pipe(
        switchMap((pageSource: PageSource<T>) =>
          shouldLoadNext$.pipe(
            startWith(false),
            mergeScan(
              (state, shouldLoadNext) => {
                if (shouldLoadNext) {
                  const nextPage = state.currentPage + 1;
                  return pageSource
                    .itemsForPage(nextPage, false).pipe(
                      defaultIfEmpty([])
                      , map((newItems: T[]) => {
                        const copy = state.book.slice(0);
                        copy[nextPage] = newItems;
                        return {
                          currentPage:
                            newItems.length === 0 ? state.currentPage : nextPage,
                          book: copy
                        };
                      })
                    )
                    ;
                } else {
                  return pageSource
                    .itemsForPage(0, true).pipe(
                      defaultIfEmpty([])
                      , map((initialItems: T[]) => {
                        return { currentPage: 0, book: [initialItems] };
                      })
                    );
                }
              },
              { currentPage: 0, book: [] as T[][] },
              1
            ),

            startWith(null)
          )
        ),
        tap(record => record && this.page$.next(record.currentPage)),
        map(record => record && record.book),
        map(
          book =>
            book &&
            book.reduce(
              (flattened, pageItems) => flattened.concat(pageItems),
              []
            )
        ),
        tap(nextValue => this.items$.next(nextValue)),
        tap(() => this.changeDetector.markForCheck()),
        tap(items => {
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
        }),
        tap(() => this.changeDetector.markForCheck()),
        takeUntil(this.ngOnDestroy$.asObservable())
      )
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
