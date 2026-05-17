import React, { useContext, useEffect, useRef, useState } from 'react';
import type { GetRef, TableProps } from 'antd';
import {
    Card,
    Form,
    InputNumber,
    Table,
    Typography,
    message,
    Flex
} from 'antd';
import { budgetsApi, type CategoryBudget } from '../api/budgets';

const { Text } = Typography;

// --- Типы и контекст ---
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
    dataIndex: keyof CategoryBudget;
    record: CategoryBudget;
    handleSave: (record: CategoryBudget) => void;
    handleClear: (id: string) => void; // Новый проп для очистки
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
                                                                                title, editable, children, dataIndex, record, handleSave, handleClear, ...restProps
                                                                            }) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<any>(null);
    const form = useContext(EditableContext)!;

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const toggleEdit = () => {
        setEditing(!editing);
        form.setFieldsValue({ [dataIndex]: record[dataIndex] });
    };

    const save = async () => {
        try {
            const values = await form.validateFields();
            toggleEdit();
            handleSave({ ...record, ...values });
        } catch (errInfo) {
            console.log('Save failed:', errInfo);
        }
    };

    let childNode = children;

    if (editable && dataIndex === 'budgetLimit') {
        childNode = editing ? (
            <Flex gap="small" align="center">
                <Form.Item
                    style={{ margin: 0, flex: 1 }}
                    name={dataIndex}
                    // Убрали required: true, теперь поле может быть пустым (null)
                    rules={[
                        { type: 'number', min: 1, max: 10_000_000, message: 'Лимит от 1 до 10 млн' }
                    ]}
                >
                    <InputNumber
                        ref={inputRef}
                        onPressEnter={save}
                        onBlur={save}
                        style={{ width: '100%' }}
                        placeholder="Без лимита"
                        controls={false} // Убираем стрелочки вверх/вниз для чистоты
                    />
                </Form.Item>
            </Flex>
        ) : (
            <div
                style={{ paddingInlineEnd: 24, cursor: 'pointer' }}
                onClick={toggleEdit}
            >
                {children}
            </div>
        );
    }

    return <td {...restProps}>{childNode}</td>;
};

// --- Основная страница ---

const Budgets: React.FC = () => {
    const [dataSource, setDataSource] = useState<CategoryBudget[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadBudgets(); }, []);

    const loadBudgets = async () => {
        setLoading(true);
        try {
            const response = await budgetsApi.getAll();
            const mappedData = response.data.map(item => ({ ...item, key: item.id.toString() }));
            setDataSource(mappedData);
        } catch (error) {
            message.error('Ошибка загрузки бюджетов');
        } finally {
            setLoading(false);
        }
    };

    // Сохранение конкретного значения (число или null)
    const handleSave = async (row: CategoryBudget) => {
        const newData = [...dataSource];
        const index = newData.findIndex((item) => row.key === item.key);
        const oldItem = newData[index];

        // Если значение не изменилось, не шлем запрос
        if (oldItem.budgetLimit === row.budgetLimit) return;

        try {
            // Отправляем на бэкенд. Если row.budgetLimit undefined или число - API обработает
            // Важно: если пользователь стер всё из инпута, value будет undefined.
            // Мы должны превратить undefined в null для API.
            const limitToSend = row.budgetLimit ?? null;

            await budgetsApi.updateLimit(row.id, limitToSend);

            message.success(limitToSend === null ? 'Лимит снят' : 'Лимит обновлен');

            newData.splice(index, 1, { ...row, budgetLimit: limitToSend });
            setDataSource(newData);
        } catch {
            message.error('Ошибка сохранения');
            loadBudgets();
        }
    };

    // Быстрая очистка лимита по кнопке
    const handleClear = async (key: string) => {
        const item = dataSource.find(d => d.key === key);
        if (!item) return;

        try {
            await budgetsApi.updateLimit(item.id, null);
            message.success('Лимит снят');

            const newData = dataSource.map(d =>
                d.key === key ? { ...d, budgetLimit: null } : d
            );
            setDataSource(newData);
        } catch (error) {
            message.error('Ошибка при снятии лимита');
        }
    };

    const columns: TableProps<CategoryBudget>['columns'] = [
        {
            title: 'Категория',
            dataIndex: 'name',
            key: 'name',
            width: '50%',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Лимит (₽)',
            dataIndex: 'budgetLimit',
            key: 'budgetLimit',
            width: '50%',
            editable: true,
            render: (val: number | null) => (
                val ? <Text>{val.toLocaleString()}</Text> : <Text type="secondary">Не ограничен</Text>
            ),
            onCell: (record) => ({
                record,
                editable: true,
                dataIndex: 'budgetLimit',
                title: 'Лимит',
                handleSave,
                handleClear, // Передаем функцию очистки
            }),
        },
    ];

    const components = { body: { row: EditableRow, cell: EditableCell } };

    return (
        <div style={{ padding: '24px' }}>
            <style>{`
                .editable-cell-value-wrap:hover {
                    border: 1px solid #d9d9d9;
                    border-radius: 2px;
                    padding: 4px 11px !important;
                    background-color: rgba(255,255,255, 0.05);
                }
            `}</style>

            <Card title="Управление бюджетами">
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                        Кликните на поле лимита, чтобы изменить его. Нажмите Enter для сохранения.
                    </Text>
                </div>

                <Table
                    components={components}
                    bordered
                    dataSource={dataSource}
                    columns={columns}
                    rowClassName="editable-row"
                    pagination={false}
                    loading={loading}
                />
            </Card>
        </div>
    );
};

export default Budgets;