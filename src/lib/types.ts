export namespace FilesManager {
	export interface File {
		id: string;
		episode: string;
	}

  export interface Files {
    files: File[];
  }
}