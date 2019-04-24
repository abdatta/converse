import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FileUploader, FileUploaderOptions, ParsedResponseHeaders } from 'ng2-file-upload';
import { Cloudinary } from '@cloudinary/angular-5.x';

@Component({
  selector: 'app-attach-image',
  templateUrl: './attach-image.component.html',
  styleUrls: ['./attach-image.component.css']
})
export class AttachImageComponent implements OnInit {

  uploader: FileUploader;
  uploading: boolean;
  @Output() progress = new EventEmitter();
  @Output() upload = new EventEmitter();

  constructor(
    private cloudinary: Cloudinary
  ) { }

  ngOnInit() {
    // Create the file uploader, wire it to upload to your account
    const uploaderOptions: FileUploaderOptions = {
      url: `https://api.cloudinary.com/v1_1/${this.cloudinary.config().cloud_name}/upload`,
      // Upload files automatically upon addition to upload queue
      autoUpload: true,
      // Use xhrTransport in favor of iframeTransport
      isHTML5: true,
      // Calculate progress independently for each uploaded file
      removeAfterUpload: true,
      // XHR request headers
      headers: [
        {
          name: 'X-Requested-With',
          value: 'XMLHttpRequest'
        }
      ]
    };
    this.uploader = new FileUploader(uploaderOptions);

    this.uploader.onBuildItemForm = (fileItem: any, form: FormData): any => {
      // Add Cloudinary's unsigned upload preset to the upload form
      form.append('upload_preset', this.cloudinary.config().upload_preset);
      // Add built-in and custom tags for displaying the uploaded photo in the list
        // let tags = 'myphotoalbum';
        // if (this.title) {
        //   form.append('context', `photo=${this.title}`);
        //   tags = `myphotoalbum,${this.title}`;
        // }
      // Upload to a custom folder
      // Note that by default, when uploading via the API, folders are not automatically created in your Media Library.
      // In order to automatically create the folders based on the API requests,
      // please go to your account upload settings and set the 'Auto-create folders' option to enabled.
      form.append('folder', 'angular_sample');
      // Add custom tags
        // form.append('tags', tags);
      // Add file to upload
      form.append('file', fileItem);

      // Use default "withCredentials" value for CORS requests
      fileItem.withCredentials = false;
      return { fileItem, form };
    };

    // Update model on completion of uploading a file
    this.uploader.onCompleteItem = (item: any, response: string, status: number, headers: ParsedResponseHeaders) => {
      if (status === 200) {
        this.upload.emit(JSON.parse(response)['secure_url']);
      }
      this.uploading = false;
    };

    // Update model on upload progress event
    this.uploader.onProgressItem = (fileItem: any, progress: any) => {
      this.uploading = true;
      this.progress.emit(progress);
    };
  }

}
