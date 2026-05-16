import React, { useContext, useEffect, useRef, useState } from 'react';
import type { GetRef, InputRef, TableProps } from 'antd';
import {
    Button,
    Form,
    Input,
    Popconfirm,
    Table,
    Calendar,
    Card,
    Flex,
    Typography,
    Tag,
    message,
    Spin,
    Empty,
    Select
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { expensesApi, type Expense, type UpdateExpenseDto } from '../api/expenses';
import { dictionariesApi, type Category, type ITag } from '../api/dictionaries';
import type { CalendarProps } from 'antd';

const { Text } = Typography;

// --- Типы для таблицы ---
type FormInstance<T> = GetRef<typeof Form<T>>;
const EditableContext = React.createContext<FormInstance<any> | null>(null);

interface EditableRowProps { index: number; }

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
    const [form] = Form.useForm();
    return (
        <Form form={form} component={false}>
            <EditableContext.Provider value={form}>
                <tr {...props} />
            </EditableContext.Provider>
        </Form>
    );
};

interface EditableCellProps {
    title: React.ReactNode;
    editable: boolean;
    dataIndex: keyof Expense | 'tagIds'; // tagIds - виртуальное поле для редактирования
    record: Expense;
    handleSave: (record: Expense) => void;
    inputType?: 'number' | 'text';
    selectOptions?: any[];
    isMultiSelect?: boolean;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
                                                                                title, editable, children, dataIndex, record, handleSave,
                                                                                inputType, selectOptions, isMultiSelect, ...restProps
                                                                            }) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<InputRef>(null);
    const form = useContext(EditableContext)!;

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const toggleEdit = () => {
        setEditing(!editing);
        // Инициализируем форму значением из рекорда.
        // Если это tagIds, берем массив чисел.
        const initialValue = dataIndex === 'tagIds' ? record.tagIds : record[dataIndex as keyof Expense];
        form.setFieldsValue({ [dataIndex]: initialValue });
    };

    const save = async () => {
        try {
            const values = await form.validateFields();
            let processedValues = { ...values };

            if (inputType === 'number') {
                const num = Number(values[dataIndex]);
                if (isNaN(num) || num <= 0) throw new Error('Сумма > 0');
                processedValues = { [dataIndex]: num };
            }

            toggleEdit();
            handleSave({ ...record, ...processedValues });
        } catch (err) {
            message.error('Ошибка ввода');
        }
    };

    let childNode = children;

    if (editable) {
        childNode = editing ? (
            <Form.Item style={{ margin: 0 }} name={dataIndex} rules={[{ required: true }]}>
                {selectOptions ? (
                    <Select
                        ref={inputRef as any}
                        onBlur={save}
                        mode={isMultiSelect ? "tags" : undefined}
                        placeholder="Выберите..."
                        options={selectOptions}
                        tokenSeparators={isMultiSelect ? [','] : undefined}
                    />
                ) : inputType === 'number' ? (
                    <Input ref={inputRef} onPressEnter={save} onBlur={save} type="number" min={0.01} step="0.01" />
                ) : (
                    <Input ref={inputRef} onPressEnter={save} onBlur={save} />
                )}
            </Form.Item>
        ) : (
            <div className="editable-cell-value-wrap" style={{ paddingInlineEnd: 24, cursor: 'pointer' }} onClick={toggleEdit}>
                {children}
            </div>
        );
    }
    return <td {...restProps}>{childNode}</td>;
};

// --- Основная страница ---

const Expenses: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [dataSource, setDataSource] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);

    // Справочники
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<ITag[]>([]);

    // Загрузка справочников один раз при старте
    useEffect(() => {
        const loadDictionaries = async () => {
            try {
                const [catsRes, tagsRes] = await Promise.all([
                    dictionariesApi.getCategories(),
                    dictionariesApi.getTags()
                ]);
                setCategories(catsRes.data);
                setTags(tagsRes.data);
            } catch (e) { message.error('Ошибка загрузки справочников'); }
        };
        loadDictionaries();
    }, []);

    // Загрузка трат при смене даты
    useEffect(() => { loadExpenses(selectedDate); }, [selectedDate]);

    const loadExpenses = async (date: Dayjs) => {
        setLoading(true);
        try {
            const response = await expensesApi.getByDate(date.format('YYYY-MM-DD'));

            // Маппинг: просто добавляем key. tagIds уже есть в ответе от бэкенда!
            const mappedData = response.data.map(item => ({
                ...item,
                key: item.id.toString()
            }));

            setDataSource(mappedData);
        } catch (error) {
            message.error('Ошибка при загрузке трат');
            setDataSource([]);
        } finally {
            setLoading(false);
        }
    };

    const onSelect: CalendarProps<Dayjs>['onSelect'] = (value) => setSelectedDate(value);
    const disabledDate: CalendarProps<Dayjs>['disabledDate'] = (current) => current && current > dayjs().endOf('day');

    // Сохранение изменений строки
    const handleSave = async (row: Expense) => {
        const newData = [...dataSource];
        const index = newData.findIndex((item) => row.key === item.key);
        const oldItem = newData[index];

        const changes: UpdateExpenseDto = {};

        // Сравниваем и формируем DTO только для измененных полей
        if (oldItem.amount !== row.amount) changes.amount = row.amount;
        if (oldItem.description !== row.description) changes.description = row.description;
        if (oldItem.categoryId !== row.categoryId) changes.categoryId = row.categoryId;

        // Сравнение массивов тегов (простое через JSON stringify для курсовой сойдет)
        if (JSON.stringify(oldItem.tagIds.sort()) !== JSON.stringify(row.tagIds.sort())) {
            changes.tagIds = row.tagIds;
        }

        if (Object.keys(changes).length === 0) return;

        try {
            await expensesApi.update(row.id, changes);
            message.success('Сохранено');

            // Обновляем локальный стейт для мгновенного UI
            // Важно: обновляем и имена тегов/категории для красоты, если они изменились
            const updatedItem = { ...oldItem, ...row };

            // Если изменилась категория, обновим её имя в локальном стейте
            if (changes.categoryId) {
                const cat = categories.find(c => c.id === changes.categoryId);
                if (cat) updatedItem.categoryName = cat.name;
            }

            // Если изменились теги, обновим их имена
            if (changes.tagIds) {
                updatedItem.tags = changes.tagIds.map(id => {
                    const t = tags.find(tag => tag.id === id);
                    return t ? t.name : 'Unknown';
                });
            }

            newData.splice(index, 1, updatedItem);
            setDataSource(newData);
        } catch (error) {
            message.error('Ошибка сохранения');
        }
    };

    const handleDelete = async (key: React.Key) => {
        const item = dataSource.find(d => d.key === key);
        if (!item) return;
        try {
            await expensesApi.delete(item.id);
            message.success('Удалено');
            setDataSource(dataSource.filter((d) => d.key !== key));
        } catch { message.error('Ошибка удаления'); }
    };

    // Опции для селектов
    const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));
    const tagOptions = tags.map(t => ({ label: t.name, value: t.id }));

    const columns: TableProps<Expense>['columns'] = [
        {
            title: 'Категория',
            dataIndex: 'categoryId',
            width: '15%',
            editable: true,
            selectOptions: categoryOptions,
            render: (_, r) => {
                const cat = categories.find(c => c.id === r.categoryId);
                return cat ? cat.name : r.categoryName;
            },
            onCell: (record) => ({ record, editable: true, dataIndex: 'categoryId', title: 'Категория', selectOptions: categoryOptions, handleSave })
        },
        {
            title: 'Сумма',
            dataIndex: 'amount',
            width: '10%',
            editable: true,
            inputType: 'number',
            render: (t) => <Text strong>{Number(t).toLocaleString()}</Text>,
            onCell: (record) => ({ record, editable: true, dataIndex: 'amount', title: 'Сумма', inputType: 'number', handleSave })
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            width: '25%',
            editable: true,
            inputType: 'text',
            render: (t) => t || <Text type="secondary">-</Text>,
            onCell: (record) => ({ record, editable: true, dataIndex: 'description', title: 'Описание', inputType: 'text', handleSave })
        },
        {
            title: 'Теги',
            dataIndex: 'tagIds', // Редактируем ID
            width: '25%',
            editable: true,
            isMultiSelect: true,
            selectOptions: tagOptions,
            render: (_, r) => r.tags.map(tag => <Tag key={tag} color="blue">{tag}</Tag>), // Отображаем имена
            onCell: (record) => ({ record, editable: true, dataIndex: 'tagIds', title: 'Теги', selectOptions: tagOptions, isMultiSelect: true, handleSave })
        },
        {
            title: '',
            width: '5%',
            render: (_, r) => (
                <Popconfirm title="Удалить?" onConfirm={() => handleDelete(r.key)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    const components = { body: { row: EditableRow, cell: EditableCell } };
    const totalAmount = dataSource.reduce((sum, i) => sum + Number(i.amount), 0);

    return (
        <div style={{ padding: '24px' }}>
            <style>{`.editable-cell-value-wrap:hover { border: 1px solid #d9d9d9; border-radius: 2px; padding: 4px 11px !important; background-color: rgba(255,255,255, 0.05); }`}</style>
            <Flex gap="large" align="start">
                <div style={{ width: 350, flexShrink: 0 }}>
                    <Card title="Дата" bordered={false}>
                        <Calendar value={selectedDate} onSelect={onSelect} disabledDate={disabledDate} fullscreen={false} />
                    </Card>
                </div>
                <div style={{ flex: 1 }}>
                    <Card title={`Траты за ${selectedDate.format('DD.MM.YYYY')} (Итого: ${totalAmount.toLocaleString()} ₽)`} extra={<Button type="primary" icon={<PlusOutlined />}>Добавить</Button>}>
                        {loading ? <Spin size="large" /> : dataSource.length === 0 ? <Empty description="Нет трат" /> : (
                            <Table components={components} rowClassName="editable-row" bordered dataSource={dataSource} columns={columns} pagination={false} scroll={{ y: 400 }} />
                        )}
                    </Card>
                </div>
            </Flex>
        </div>
    );
};

export default Expenses;