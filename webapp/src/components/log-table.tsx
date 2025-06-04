import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  timestamp: string
  level: string
  message: string
  fields?: Record<string, any>
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return date
    .toLocaleString('zh-CN', {
      // year: 'numeric',
      // month: '2-digit',
      // day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace('-', '/')
    .replace(',', '');
}

function getLevelBadgeVariant(level: string) {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return 'destructive';
    case 'WARN':
      return 'secondary';
    case 'INFO':
      return 'default';
    case 'DEBUG':
      return 'outline';
    default:
      return 'default';
  }
}

// 获取字段值，如果不存在则返回 "-"
function getFieldValue(entry: LogEntry, fieldName: string) {
  if (!entry.fields || entry.fields[fieldName] === undefined)
    return '-';

  return String(entry.fields[fieldName]);
}

interface Props {
  className: string
  data: LogEntry[]
}

export default function LogTable({ className, data }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState('');

  const displayFields = useMemo(() => {
    const excludeFields = new Set(['tag', 'type', 'file', 'addr', 'length', 'entries', 'tls']);
    const allFields = new Set<string>();

    data.forEach(entry => {
      if (entry.fields) {
        Object.keys(entry.fields).forEach(key => {
          if (!excludeFields.has(key))
            allFields.add(key);
        });
      }
    });

    return Array.from(allFields).sort();
  }, [data]);

  // 排序数据
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
  }, [data]);

  // 搜索过滤数据
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return sortedData;

    const searchLower = searchTerm.toLowerCase();

    return sortedData.filter(entry => {
      // 搜索消息内容
      if (entry.message.toLowerCase().includes(searchLower))
        return true;

      // 搜索字段值
      if (entry.fields) {
        return displayFields.some(field => {
          const fieldValue = entry.fields?.[field];
          if (fieldValue !== undefined)
            return String(fieldValue).toLowerCase().includes(searchLower);

          return false;
        });
      }

      return false;
    });
  }, [sortedData, searchTerm, displayFields]);

  // 计算分页数据
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1); // 重置到第一页
  };

  return (
    <div className={cn(['space-y-4', className])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">每页显示</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">条记录</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索消息或字段值..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 搜索时重置到第一页
              }}
              className="pl-8 w-64"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            共 {data.length} 条记录
          </div>
        </div>

      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">时间戳</TableHead>
              <TableHead className="w-16 whitespace-nowrap">级别</TableHead>
              <TableHead className="whitespace-nowrap">消息</TableHead>
              {displayFields.map(field => (
                <TableHead key={field} className="whitespace-nowrap">
                  {field}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map(entry => (
              <TableRow key={entry.timestamp + Math.random()}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant={getLevelBadgeVariant(entry.level)}>{entry.level}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={entry.message}>
                    {entry.message}
                  </div>
                </TableCell>
                {displayFields.map(field => (
                  <TableCell key={field} className="whitespace-nowrap text-xs truncate max-w-48">
                    {getFieldValue(entry, field)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          显示第 {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} -{' '}
          {Math.min(currentPage * pageSize, filteredData.length)} 条，共 {filteredData.length} 条
          {searchTerm && ` (从 ${data.length} 条中筛选)`}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-1">
            <span className="text-sm">第</span>
            <span className="text-sm font-medium">{currentPage}</span>
            <span className="text-sm">页，共</span>
            <span className="text-sm font-medium">{totalPages}</span>
            <span className="text-sm">页</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
