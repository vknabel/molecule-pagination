import {
  ChangeDetectorRef,
  Directive,
  EmbeddedViewRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/never';
import 'rxjs/add/observable/of';
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

export type PageLoader<T> = (
  page: number,
  forceReload: boolean
) => Observable<T[]>;

@Directive({
  selector: '[molPagination]'
})
export class PaginationDirective<T> implements OnChanges, OnDestroy {
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
    this.ngOnChanges$
      .pluck('molPaginationLoadNext', 'currentValue')
      .switchMap(
        (loadNext$: Observable<void>): Observable<void> =>
          loadNext$ || Observable.never<void>()
      )
      .takeUntil(this.ngOnDestroy$)
      .subscribe(() => this.page$.next(this.page$.getValue() + 1));

    const hardReload$ = this.ngOnChanges$
      .pluck('molPaginationHardReload', 'currentValue')
      .filter((v: Observable<void>) => v != null)
      .startWith<Observable<void>>(Observable.never<void>())
      .switch()
      .do(() => this.page$.next(0));
    const latestRequest$ = this.ngOnChanges$
      .pluck('molPagination', 'currentValue')
      .map(
        (loader: PageLoader<T>) =>
          loader || ((() => Observable.never()) as PageLoader<T>)
      );

    latestRequest$
      .switchMap((itemsForPage: PageLoader<T>) =>
        this.page$
          .mergeMap(page =>
            hardReload$
              .mapTo(true)
              .startWith(false)
              .mergeMap(wasForced =>
                itemsForPage(page, wasForced).defaultIfEmpty([])
              )
              .map(items => ({ page, items }))
          )
          .scan((book: T[][], nextPage) => {
            book[nextPage.page] = nextPage.items;
            return book;
          }, [])
          .map(book =>
            book.reduce(
              (flattened, pageItems) => flattened.concat(pageItems),
              []
            )
          )
          .startWith(null)
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
      .takeUntil(this.ngOnDestroy$)
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
