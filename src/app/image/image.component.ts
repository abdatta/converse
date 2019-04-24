import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.css']
})
export class ImageComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<ImageComponent>,
              @Inject(MAT_DIALOG_DATA) public url: string) { }

  ngOnInit() {
  }

  close() {
    this.dialogRef.close();
  }

}
