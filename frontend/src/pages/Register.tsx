import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate, Link } from 'react-router';
import { authApi } from '../api/auth';

const Register: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    // Регулярка: мин 6 символов, 1 заглавная, 1 строчная, 1 не-буква
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z]).{6,}$/;

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            await authApi.register(values);
            message.success('Регистрация успешна! Теперь войдите.');
            navigate('/sign-in');
        } catch (error: any) {
            // Если ошибка валидации Identity (например, юзер занят)
            const errors = error.response?.data;
            if (Array.isArray(errors)) {
                errors.forEach((err: any) => message.error(err.description));
            } else {
                message.error('Ошибка регистрации');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Card title="Регистрация" style={{ width: 400 }}>
                <Form form={form} name="register" onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" label="Юзернейм" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Пароль"
                        rules={[
                            { required: true },
                            { pattern: passwordRegex, message: 'Пароль должен содержать мин. 6 символов, заглавную, строчную букву и спецсимвол' }
                        ]}
                        hasFeedback
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Повторите пароль"
                        dependencies={['password']}
                        hasFeedback
                        rules={[
                            { required: true },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Пароли не совпадают'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            disabled={!form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                        >
                            Зарегистрироваться
                        </Button>
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                            Уже есть аккаунт? <Link to="/sign-in">Войти</Link>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Register;