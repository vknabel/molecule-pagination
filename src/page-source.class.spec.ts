import { PageSource } from './page-source.class';
import { tap, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

describe('page source', () => {
  let spy: jasmine.Spy;
  let sut: PageSource<string>;

  function itForPage(
    expectation: string,
    forPageIndex: number,
    forceReload: boolean,
    assertion: (result: string[]) => void
  ) {
    it(expectation, done => {
      sut
        .itemsForPage(forPageIndex, forceReload).pipe(
          tap(assertion, error => fail(error)),
          finalize(() => done())
        )
        .subscribe();
    });
  }

  function describeForPageSource(
    description: string,
    setup: () => void,
    assert: string[][]
  ) {
    describe(description, () => {
      beforeEach(setup);

      it('can be constructed', () => {
        expect(new PageSource(() => [])).toEqual(jasmine.any(PageSource));
      });

      it('#from returns a page source', () => {
        expect(sut).toEqual(jasmine.any(PageSource));
      });

      itForPage(
        '#itemsForPage returns expected result for first page on force reload',
        0,
        true,
        result => {
          expect(result).toEqual(assert[0] || []);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(0, true);
        }
      );

      itForPage(
        '#itemsForPage returns expected result for second page on force reload',
        1,
        true,
        result => {
          expect(result).toEqual(assert[1] || []);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(1, true);
        }
      );

      itForPage(
        '#itemsForPage returns expected result for third page on force reload',
        2,
        true,
        result => {
          expect(result).toEqual(assert[2] || []);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(2, true);
        }
      );

      itForPage(
        '#itemsForPage returns expected result for first page when not forced',
        0,
        false,
        result => {
          expect(result).toEqual(assert[0] || []);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(0, false);
        }
      );

      itForPage(
        '#itemsForPage returns expected result for second page when not forced',
        1,
        false,
        result => {
          expect(result).toEqual(assert[1] || []);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(1, false);
        }
      );

      itForPage(
        '#itemsForPage returns expected result for third page when not forced',
        2,
        false,
        result => {
          expect(result).toEqual(assert[2] || []);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(2, false);
        }
      );
    });
  }

  describeForPageSource(
    'when created from another source',
    () => {
      spy = jasmine
        .createSpy('page loader', (index, wasForced) => {
          if (index === 0) {
            return ['Hello', 'world', '!'];
          } else if (index === 1) {
            return ['How', 'are', 'you', '?'];
          } else {
            return [];
          }
        })
        .and.callThrough();
      sut = PageSource.from(new PageSource<string>(spy));
    },
    [['Hello', 'world', '!'], ['How', 'are', 'you', '?']]
  );

  describeForPageSource(
    'when created from loader',
    () => {
      spy = jasmine
        .createSpy('page loader', (index, wasForced) => {
          if (index === 0) {
            return ['Hello', 'world', '!'];
          } else if (index === 1) {
            return ['How', 'are', 'you', '?'];
          } else {
            return [];
          }
        })
        .and.callThrough();
      sut = PageSource.from<string>(spy);
    },
    [['Hello', 'world', '!'], ['How', 'are', 'you', '?']]
  );

  describeForPageSource(
    'when created unsing a loader',
    () => {
      spy = jasmine
        .createSpy('page loader', (index, wasForced) => {
          if (index === 0) {
            return ['Hello', 'world', '!'];
          } else if (index === 1) {
            return ['How', 'are', 'you', '?'];
          } else {
            return [];
          }
        })
        .and.callThrough();
      sut = new PageSource<string>(spy);
    },
    [['Hello', 'world', '!'], ['How', 'are', 'you', '?']]
  );

  describeForPageSource(
    'when mapping a loader',
    () => {
      spy = jasmine
        .createSpy('page loader', (index, wasForced) => {
          if (index === 0) {
            return ['Hello', 'world', '!'];
          } else if (index === 1) {
            return ['How', 'are', 'you', '?'];
          } else {
            return [];
          }
        })
        .and.callThrough();
      sut = new PageSource<string>(spy).map(contents =>
        contents.map(content => content.toUpperCase())
      );
    },
    [['HELLO', 'WORLD', '!'], ['HOW', 'ARE', 'YOU', '?']]
  );

  describeForPageSource(
    'when flat mapping a loader',
    () => {
      spy = jasmine
        .createSpy('page loader', (index, wasForced) => {
          if (index === 0) {
            return ['Hello', 'world', '!'];
          } else if (index === 1) {
            return ['How', 'are', 'you', '?'];
          } else {
            return [];
          }
        })
        .and.callThrough();
      sut = new PageSource<string>(spy).flatMap(contents =>
        of(contents.map(content => content.toLowerCase()))
      );
    },
    [['hello', 'world', '!'], ['how', 'are', 'you', '?']]
  );

  describeForPageSource(
    'when merge mapping a loader',
    () => {
      spy = jasmine
        .createSpy('page loader', (index, wasForced) => {
          if (index === 0) {
            return ['Hello', 'world', '!'];
          } else if (index === 1) {
            return ['How', 'are', 'you', '?'];
          } else {
            return [];
          }
        })
        .and.callThrough();
      sut = new PageSource<string>(spy).mergeMap(contents =>
        of(contents.map(content => content.toLowerCase()))
      );
    },
    [['hello', 'world', '!'], ['how', 'are', 'you', '?']]
  );
});
