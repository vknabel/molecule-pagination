import { Observable, ObservableInput } from 'rxjs/Observable';
import 'rxjs/add/observable/from';

export type PageLoader<T> = (
  page: number,
  forceReload: boolean
) => T[] | Observable<T[]>;

export type PageSourceLike<T> = PageLoader<T> | PageSource<T>;

export class PageSource<T> {
  public static empty<T>(): PageSource<T> {
    return new PageSource(() => []);
  }

  public static from<T>(sourceLike: PageSourceLike<T> | null): PageSource<T> {
    return sourceLike instanceof PageSource
      ? sourceLike
      : new PageSource(sourceLike || (() => []));
  }

  constructor(private readonly loader: PageLoader<T>) {}

  public itemsForPage(pageIndex: number, wasForced: boolean): Observable<T[]> {
    const items = this.loader(pageIndex, wasForced);
    return Array.isArray(items) ? Observable.of(items) : Observable.from(items);
  }

  public map<R>(
    transform: (contents: T[], pageIndex: number, wasForced: boolean) => R[]
  ): PageSource<R> {
    return new PageSource((pageIndex, wasForced) =>
      this.itemsForPage(pageIndex, wasForced).map(contents =>
        transform(contents, pageIndex, wasForced)
      )
    );
  }

  public flatMap<R>(
    transform: (
      contents: T[],
      pageIndex: number,
      wasForced: boolean
    ) => ObservableInput<R[]>
  ): PageSource<R> {
    return new PageSource((pageIndex, wasForced) =>
      this.itemsForPage(pageIndex, wasForced).mergeMap(contents =>
        transform(contents, pageIndex, wasForced)
      )
    );
  }

  public mergeMap<R>(
    transform: (
      contents: T[],
      pageIndex: number,
      wasForced: boolean
    ) => ObservableInput<R[]>
  ): PageSource<R> {
    return this.flatMap(transform);
  }
}
