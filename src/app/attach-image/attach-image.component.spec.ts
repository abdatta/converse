import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachImageComponent } from './attach-image.component';

describe('AttachImageComponent', () => {
  let component: AttachImageComponent;
  let fixture: ComponentFixture<AttachImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AttachImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AttachImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
