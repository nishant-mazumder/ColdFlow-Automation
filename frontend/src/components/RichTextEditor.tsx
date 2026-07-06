'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import 'react-quill-new/dist/quill.snow.css';

// React 19 compatibility requires react-quill-new
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function RichTextEditor({ value, onChange, placeholder, style }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'indent',
    'link'
  ];

  return (
    <div style={{ ...style, background: 'white', color: 'black', borderRadius: '8px', overflow: 'hidden' }}>
      <ReactQuill 
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style dangerouslySetInnerHTML={{__html: `
        .ql-container {
          font-family: inherit;
          font-size: 1rem;
        }
        .ql-editor {
          min-height: 200px;
        }
        .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .ql-container {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
      `}} />
    </div>
  );
}
