import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate, Link } from 'react-router';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            await authApi.login(values);
            message.success('Успешный вход!');
            login(values.username); // Обновляем состояние в контексте
            navigate('/me');
        } catch (error: any) {
            message.error(error.response?.data || 'Ошибка входа. Проверьте данные.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Card title="Вход в систему" style={{ width: 400 }}>
                <Form name="login" onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" label="Юзернейм" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Войти
                        </Button>
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                            Нет аккаунта? <Link to="/sign-up">Зарегистрироваться</Link>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;