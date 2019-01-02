import { Observable, from, of, ObservableInput } from 'rxjs';
import { tap, map, mergeMap } from 'rxjs/operators';

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
    return Array.isArray(items) ? of(items) : from(items);
  }

  public do(
    next?: (contents: T[], pageIndex: number, wasForced: boolean) => void,
    error?: (error: {}, pageIndex: number, wasForced: boolean) => void,
    complete?: (pageIndex: number, wasForced: boolean) => void
  ): PageSource<T> {
    return new PageSource((pageIndex, wasForced) =>
      this.itemsForPage(pageIndex, wasForced).pipe(
        tap(
          value => next && next(value, pageIndex, wasForced),
          cause => error && error(cause, pageIndex, wasForced),
          () => complete && complete(pageIndex, wasForced)
        )
      )
    );
  }

  public map<R>(
    transform: (contents: T[], pageIndex: number, wasForced: boolean) => R[]
  ): PageSource<R> {
    return new PageSource((pageIndex, wasForced) =>
      this.itemsForPage(pageIndex, wasForced).pipe(map(contents =>
        transform(contents, pageIndex, wasForced)
      ))
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
      this.itemsForPage(pageIndex, wasForced).pipe(
        mergeMap(contents =>
          transform(contents, pageIndex, wasForced)
        )
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
