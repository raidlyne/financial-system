import React, { useContext, useEffect, useRef, useState } from 'react';
import {type GetRef, InputNumber, type InputRef, Modal, type TableProps} from 'antd';
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
    dataIndex: keyof Expense | 'tagIds';
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
        } catch {
            message.error('Ошибка ввода');
        }
    };

    let childNode = children;

    const isEmptyValue = () => {
        if (selectOptions) {
            const value = dataIndex === 'tagIds' ? record.tagIds : record[dataIndex as keyof Expense];
            return !value || (Array.isArray(value) && value.length === 0);
        }
        return false;
    };

    if (editable) {
        childNode = editing ? (
            <Form.Item style={{ margin: 0 }} name={dataIndex} rules={[{ required: false }]}>
                {selectOptions ? (
                    <Select
                        ref={inputRef as any}
                        onBlur={save}
                        mode={isMultiSelect ? "multiple" : undefined}
                        placeholder="Выберите..."
                        options={selectOptions}
                        style={{ width: '100%' }}
                    />
                ) : inputType === 'number' ? (
                    <Input ref={inputRef} onPressEnter={save} onBlur={save} type="number" min={0.01} step="0.01" />
                ) : (
                    <Input ref={inputRef} onPressEnter={save} onBlur={save} />
                )}
            </Form.Item>
        ) : (
            <div
                onClick={toggleEdit}
            >
                {isEmptyValue() ? (
                    <span style={{ color: '#999', fontSize: 14 }}>
                        {selectOptions ? 'Добавить...' : 'Нажмите для редактирования'}
                    </span>
                ) : (
                    children
                )}
            </div>
        );
    }
    return <td {...restProps}>{childNode}</td>;
};


const Expenses: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [dataSource, setDataSource] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expenseDates, setExpenseDates] = useState<Set<string>>(new Set());
    const [createForm] = Form.useForm();

    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<ITag[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                const [catsRes, tagsRes, datesRes] = await Promise.all([
                    dictionariesApi.getCategories(),
                    dictionariesApi.getTags(),
                    expensesApi.getExpenseDates()
                ]);

                setCategories(catsRes.data);
                setTags(tagsRes.data);

                setExpenseDates(new Set(datesRes.data));
            } catch  {
                message.error('Ошибка инициализации');
            }
        };
        init();
    }, []);

    // Загрузка трат при смене даты
    useEffect(() => { loadExpenses(selectedDate); }, [selectedDate]);

    const loadExpenses = async (date: Dayjs) => {
        setLoading(true);
        try {
            const response = await expensesApi.getByDate(date.format('YYYY-MM-DD'));

            const mappedData = response.data.map(item => ({
                ...item,
                key: item.id.toString()
            }));

            setDataSource(mappedData);
        } catch {
            message.error('Ошибка при загрузке трат');
            setDataSource([]);
        } finally {
            setLoading(false);
        }
    };

    const onSelect: CalendarProps<Dayjs>['onSelect'] = (value) => setSelectedDate(value);
    const disabledDate: CalendarProps<Dayjs>['disabledDate'] = (current) => current && current > dayjs().endOf('day');

    const handleSave = async (row: Expense) => {
        const newData = [...dataSource];
        const index = newData.findIndex((item) => row.key === item.key);
        const oldItem = newData[index];

        const changes: UpdateExpenseDto = {};

        if (oldItem.amount !== row.amount) changes.amount = row.amount;
        if (oldItem.description !== row.description) changes.description = row.description;
        if (oldItem.categoryId !== row.categoryId) changes.categoryId = row.categoryId;

        if (JSON.stringify(oldItem.tagIds.sort()) !== JSON.stringify(row.tagIds.sort())) {
            changes.tagIds = row.tagIds;
        }

        if (Object.keys(changes).length === 0) return;

        try {
            await expensesApi.update(row.id, changes);
            message.success('Сохранено');

            const updatedItem = { ...oldItem, ...row };

            if (changes.categoryId) {
                const cat = categories.find(c => c.id === changes.categoryId);
                if (cat) updatedItem.categoryName = cat.name;
            }

            if (changes.tagIds) {
                updatedItem.tags = changes.tagIds.map(id => {
                    const t = tags.find(tag => tag.id === id);
                    return t ? t.name : 'Unknown';
                });
            }

            newData.splice(index, 1, updatedItem);
            setDataSource(newData);
        } catch {
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
            refreshExpenseDates()
        } catch { message.error('Ошибка удаления'); }
    };

    const showModal = () => {
        createForm.setFieldsValue({
            date: selectedDate,
            amount: undefined,
            description: '',
            categoryId: undefined,
            tagIds: []
        });
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        createForm.resetFields();
    };
    const handleCreateSubmit = async (values: any) => {
        try {
            const payload = {
                categoryId: values.categoryId,
                amount: values.amount,
                description: values.description,
                tagIds: values.tagIds || [],
                date: selectedDate.format('YYYY-MM-DD')
            };

            await expensesApi.create(payload);
            message.success('Трата успешно добавлена');
            setIsModalOpen(false);
            createForm.resetFields();

            loadExpenses(selectedDate);
            refreshExpenseDates();
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.message || 'Ошибка при создании траты');
        }
    };

    const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));
    const tagOptions = tags.map(t => ({ label: t.name, value: t.id }));

    const columns: TableProps<Expense>['columns'] = [
        {
            title: 'Категория',
            dataIndex: 'categoryId',
            width: 150,
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
            width: 100,
            inputType: 'number',
            render: (t) => <Text strong>{Number(t).toLocaleString()}</Text>,
            onCell: (record) => ({ record, editable: true, dataIndex: 'amount', title: 'Сумма', inputType: 'number', handleSave })
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            width: 200,
            inputType: 'text',
            ellipsis: false,
            render: (t) => t ? <span style={{ whiteSpace: 'pre-wrap' }}>{t}</span> : <Text type="secondary">-</Text>,
            onCell: (record) => ({ record, editable: true, dataIndex: 'description', title: 'Описание', inputType: 'text', handleSave })
        },
        {
            title: 'Теги',
            dataIndex: 'tagIds',
            width: 150,
            isMultiSelect: true,
            selectOptions: tagOptions,
            ellipsis: false,
            render: (_, r) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.tags.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
                </div>
            ),
            onCell: (record) => ({ record, editable: true, dataIndex: 'tagIds', title: 'Теги', selectOptions: tagOptions, isMultiSelect: true, handleSave })
        },
        {
            title: 'Действия',
            width: 100,
            fixed: 'right',
            render: (_, r) => (
                <Popconfirm title="Удалить?" onConfirm={() => handleDelete(r.key)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    const components = { body: { row: EditableRow, cell: EditableCell } };
    const totalAmount = dataSource.reduce((sum, i) => sum + Number(i.amount), 0);
    const dateCellRender = (current: Dayjs) => {
        const dateStr = current.format('YYYY-MM-DD');
        const hasExpenses = expenseDates.has(dateStr);

        return hasExpenses ? (
            <div style={{
                width: 6,
                height: 6,
                backgroundColor: '#1890ff',
                borderRadius: '50%',
                margin: '2px auto 0'
            }} />
        ) : null;
    };
    const refreshExpenseDates = async () => {
        try {
            const datesRes = await expensesApi.getExpenseDates();
            setExpenseDates(new Set(datesRes.data));
        } catch  {
            console.error("Failed to refresh expense dates");
        }
    };

    return (
        <div style={{ padding: '24px', minHeight: '100vh' }}>
            <style>{`
                .editable-cell-value-wrap:hover { border: 1px solid #d9d9d9; border-radius: 2px; padding: 4px 11px !important; background-color: rgba(255,255,255, 0.05); }
                .ant-table-tbody > tr > td { white-space: normal !important; word-break: break-word !important; }
            `}</style>

            <Flex gap="large" align="start" wrap="wrap">
                <div style={{ width: 350, flexShrink: 0, minWidth: '300px' }}>
                    <Card title="Выберите дату" variant="borderless" style={{ marginBottom: 16 }}>
                        <Calendar value={selectedDate} onSelect={onSelect} disabledDate={disabledDate} fullscreen={false} cellRender={dateCellRender} />
                    </Card>
                </div>

                <div style={{ flex: 1, minWidth: '300px' }}>
                    <Card
                        title={`Траты за ${selectedDate.format('DD.MM.YYYY')}`}
                        extra={
                            <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                                Добавить
                            </Button>
                        }
                    >
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text type="secondary">Список операций</Text>
                            <Text strong style={{ fontSize: 18 }}>Итого: {totalAmount.toLocaleString()} ₽</Text>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin size="large" />
                            </div>
                        ) : dataSource.length === 0 ? (
                            <Empty description="Нет трат за этот день" />
                        ) : (
                            <Table
                                components={components}
                                rowClassName="editable-row"
                                bordered
                                dataSource={dataSource}
                                columns={columns}
                                pagination={false}
                                scroll={{ y: 400 }}
                            />
                        )}
                    </Card>
                </div>
            </Flex>

            <Modal
                title={`Новая трата на ${selectedDate.format('DD.MM.YYYY')}`}
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateSubmit}
                    initialValues={{
                        amount: undefined,
                        description: '',
                        categoryId: undefined,
                        tagIds: []
                    }}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="categoryId"
                        label="Категория"
                        rules={[{ required: true, message: 'Выберите категорию' }]}
                    >
                        <Select placeholder="Выберите категорию" options={categoryOptions} />
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label="Сумма"
                        rules={[{ required: true, message: 'Введите сумму' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0.01}
                            step={0.01}
                            placeholder="0.00"
                            prefix="₽"
                        />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Описание"
                        rules={[{ required: true, message: 'Введите описание' }]}
                    >
                        <Input.TextArea rows={3} placeholder="Например: Обед в кафе" />
                    </Form.Item>

                    <Form.Item
                        name="tagIds"
                        label="Теги"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Выберите теги"
                            options={tagOptions}
                            maxTagCount="responsive"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                            Отмена
                        </Button>
                        <Button type="primary" htmlType="submit">
                            Создать
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
;
};

export default Expenses;