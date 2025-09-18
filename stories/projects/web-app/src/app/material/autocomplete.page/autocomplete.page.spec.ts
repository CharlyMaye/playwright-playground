import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutocompletePage } from './autocomplete.page';

describe('AutocompletePage', () => {
  let component: AutocompletePage;
  let fixture: ComponentFixture<AutocompletePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutocompletePage],
    }).compileComponents();

    fixture = TestBed.createComponent(AutocompletePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
