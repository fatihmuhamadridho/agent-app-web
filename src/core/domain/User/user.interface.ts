export interface DetailUserProps {
  id: string;
  name?: string;
  email?: string;
}

export declare namespace UserResult {
  export type getDetailUser = DetailUserProps;
}
