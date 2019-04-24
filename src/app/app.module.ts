import { environment } from 'src/environments/environment';
import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule
  } from '@angular/material';

import { CookieService } from 'ngx-cookie-service';
import { AngularPageVisibilityModule } from 'angular-page-visibility';
import { FileUploadModule } from 'ng2-file-upload';
import { CloudinaryModule, CloudinaryConfiguration } from '@cloudinary/angular-5.x';
import { Cloudinary } from 'cloudinary-core';
import { AppComponent } from './app.component';
import { ChatService } from './services/chat.service';
import { LoginComponent } from './login/login.component';
import { AttachImageComponent } from './attach-image/attach-image.component';
import { ImageComponent } from './image/image.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AttachImageComponent,
    ImageComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    AngularPageVisibilityModule,
    FileUploadModule,
    CloudinaryModule.forRoot({ Cloudinary },
      { cloud_name: 'converse-app', upload_preset: environment.upload_preset } as CloudinaryConfiguration),
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule
  ],
  providers: [Title, ChatService, CookieService],
  entryComponents: [LoginComponent, ImageComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
