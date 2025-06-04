import { toast } from 'sonner';
import { useState } from 'react';

import useSWR from 'swr';
import { fetcher } from './lib/fetcher';

import LogTable from './components/log-table';

import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModeToggle } from './components/mode-toggle';

type DirType = 'config' | 'rule';

function action(key: string) {
  return toast.promise(fetcher<string>(key), {
    loading: '...',
    success: text => text,
    error: e => e?.message
  });
}

export default function App() {
  const [dt, setDt] = useState<DirType>('config');
  const [file, setFile] = useState('');
  const [fileContent, setFileContent] = useState('');

  const [showLog, setShowLog] = useState(false);

  const { data: files } = useSWR<string[]>(`/${dt}`, fetcher);
  const { data: content, mutate: mutateContent } = useSWR<string>(file ? `/${dt}/${file}` : null, fetcher);
  if (fileContent === '' && content)
    setFileContent(content);

  const { data = [], mutate } = useSWR<any[]>('/log', fetcher);

  const onSave = () => toast.promise(
    () => fetcher<string>(`${dt}/${file}`, { method: 'POST', body: fileContent }),
    {
      loading: '...',
      success: text => text,
      error: e => e?.message,
      finally() { mutateContent(); }
    }
  );

  return (
    <main className="max-w-5xl mx-auto my-10">
      <div className="flex items-center gap-2">
        <Select value={dt} onValueChange={(v: DirType) => { setDt(v); setFile(''); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择配置文件类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem key="config" value="config">
                Config
              </SelectItem>
              <SelectItem key="rule" value="rule">
                Rule
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={file} onValueChange={v => { setFile(v); setFileContent(''); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择文件" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {files?.map(file => (
                <SelectItem key={file} value={file}>
                  {file}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onSave}>保存</Button>
        <Button variant="outline" onClick={() => action('/start')}>启动</Button>
        <Button variant="outline" onClick={() => action('/stop')}>停止</Button>
        <Button variant="outline" onClick={() => action('/restart')}>重启</Button>
        <Button variant="outline" onClick={() => setShowLog(!showLog)} className={showLog ? 'op-50' : ''}>日志</Button>
        <Button variant="outline" onClick={() => mutate()}>刷新日志</Button>
        <ModeToggle />
      </div>

      <Textarea className="mt-8 font-mono h-[80vh]" style={{ display: showLog ? 'none' : 'flex' }} value={fileContent} onChange={e => setFileContent(e.target.value)} />
      <LogTable className={`mt-8 ${showLog ? '' : 'hidden'}`} data={data} />
    </main>
  );
}
